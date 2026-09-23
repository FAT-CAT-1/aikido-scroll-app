// three.js での描画（docs/animation-spec.md §13-5）。技詳細の画面で遅延読み込みする
//
// - 人は「デッサン人形」：胴・手足をカプセル、頭・胸・腰を球で表し、輪郭線を付けて墨絵に寄せる
// - 注目側は濃墨、相手は淡墨（2D と同じ）。注目側だけ帯（丹田）の向きを朱の矢印で示す（視線は「目」の吹き出しの起点が視線の上に乗る）
// - 床は畳（1畳 1.82m×0.91m）。縁の線で大きさと足運びが分かる
// - 描くのは姿勢・カメラ・拡大が変わったときだけ（再生中は毎フレーム）
import {
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  RedFormat,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  Vector4,
  WebGLRenderer,
  type Material,
} from 'three'
import type { Body3D, Figure3D, Joint3D, Role, Vec3 } from '../content/types'
import type { Cam, Zoom } from './camera'
import type { Scene3D } from './pose3d'

export interface Palette {
  focus: string
  focusLine: string
  other: string
  otherLine: string
  shu: string
  floor: string
  floorLine: string
}

/** CSS のトークンから色を読む（tokens.css と同じ色で描く） */
export function paletteFromCss(el: Element = document.documentElement): Palette {
  const css = getComputedStyle(el)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    focus: v('--sumi-nou', '#333333'),
    focusLine: v('--sumi-shou', '#1a1a1a'),
    other: v('--sumi-sei', '#c9c4b8'),
    otherLine: v('--sumi-tan', '#8a8a8a'),
    shu: v('--shu', '#b7282e'),
    floor: v('--washi-deep', '#e6dcc6'),
    floorLine: v('--sumi-sei', '#c9c4b8'),
  }
}

export interface Renderer3D {
  /** 描画用のプログラム（シェーダー）を材料ごとに分けて用意する（1回の長い処理にしない）。最初に描く前に待つ */
  warmUp(scene: Scene3D, view: Role, cam: Cam): Promise<void>
  update(scene: Scene3D, view: Role, cam: Cam, zoom: Zoom): void
  resize(width: number, height: number): void
  dispose(): void
}

const Y = new Vector3(0, 1, 0)
const OUTLINE = 0.009

// ---- 部品 ----

interface Segment {
  from: Joint3D
  to: Joint3D
  /** 0〜1：from→to の間のどこに置くか（球だけ） */
  at?: number
  meshes: Mesh[]
  kind: 'capsule' | 'sphere' | 'foot'
}

function toonGradient() {
  // 3段階の明暗（墨の濃淡）
  const data = new Uint8Array([90, 170, 255])
  const tex = new DataTexture(data, 3, 1, RedFormat)
  tex.minFilter = NearestFilter
  tex.magFilter = NearestFilter
  tex.needsUpdate = true
  return tex
}

class FigureMesh {
  readonly group = new Group()
  private readonly body: Body3D
  private readonly fill: MeshToonMaterial
  private readonly line: MeshBasicMaterial
  private readonly segments: Segment[] = []
  private readonly belt: Mesh
  private readonly beltLine: Mesh
  private readonly arrow: Mesh
  private readonly nose: Mesh
  private readonly noseMat = new MeshBasicMaterial({ color: '#000' })
  private readonly disposables: { dispose(): void }[] = []

  constructor(body: Body3D, gradient: DataTexture, shu: string) {
    this.body = body
    this.fill = new MeshToonMaterial({ color: '#888', gradientMap: gradient })
    this.line = new MeshBasicMaterial({ color: '#000', side: BackSide })
    this.disposables.push(this.fill, this.line)
    const r = body.radii
    const b = body.bones
    const cap = (from: Joint3D, to: Joint3D, radius: number, len: number) => this.addCapsule(from, to, radius, len)
    const ball = (from: Joint3D, to: Joint3D, at: number, radius: number) => this.addSphere(from, to, at, radius)

    // 胴：背骨のカプセル＋胸・腰の球（デッサン人形）
    cap('hip', 'neck', r.torso ?? 0.105, b.spine ?? 0.5)
    ball('hip', 'neck', 0.72, r.chest ?? 0.14)
    ball('hip', 'neck', 0.02, r.pelvis ?? 0.125)
    cap('neck', 'head', r.neck ?? 0.045, (b['neck-head'] ?? 0.16) * 0.6)
    ball('head', 'head', 0, r.head ?? 0.105)
    for (const s of ['l', 'r'] as const) {
      cap('neck', `shoulder_${s}`, r.shoulder ?? 0.05, b['neck-shoulder'] ?? 0.19)
      ball(`shoulder_${s}`, `shoulder_${s}`, 0, (r['upper-arm'] ?? 0.047) * 1.15)
      cap(`shoulder_${s}`, `elbow_${s}`, r['upper-arm'] ?? 0.047, b['upper-arm'] ?? 0.28)
      ball(`elbow_${s}`, `elbow_${s}`, 0, (r.forearm ?? 0.04) * 1.12)
      cap(`elbow_${s}`, `wrist_${s}`, r.forearm ?? 0.04, b.forearm ?? 0.25)
      cap(`wrist_${s}`, `hand_${s}`, r.hand ?? 0.043, (b.hand ?? 0.09) * 0.7)
      cap(`hip`, `hipjoint_${s}`, (r.thigh ?? 0.068) * 0.9, b['hip-hipjoint'] ?? 0.114)
      cap(`hipjoint_${s}`, `knee_${s}`, r.thigh ?? 0.068, b.thigh ?? 0.43)
      ball(`knee_${s}`, `knee_${s}`, 0, (r.shin ?? 0.052) * 1.12)
      cap(`knee_${s}`, `ankle_${s}`, r.shin ?? 0.052, b.shin ?? 0.42)
      this.addFoot(`ankle_${s}`, `toe_${s}`, r.foot ?? 0.042, b.foot ?? 0.19)
    }

    // 帯（腰に巻く輪）と、帯の結び目の向き（朱の矢印）
    const beltGeo = new TorusGeometry((r.pelvis ?? 0.125) + 0.006, 0.02, 8, 28)
    const beltLineGeo = new TorusGeometry((r.pelvis ?? 0.125) + 0.006, 0.02 + OUTLINE, 8, 28)
    this.belt = new Mesh(beltGeo, this.fill)
    this.beltLine = new Mesh(beltLineGeo, this.line)
    const arrowGeo = new ConeGeometry(0.035, 0.12, 12)
    arrowGeo.rotateZ(-Math.PI / 2) // 先端を +x に
    this.arrow = new Mesh(arrowGeo, new MeshBasicMaterial({ color: shu }))
    // 顔の向き（鼻）
    const noseGeo = new ConeGeometry(0.028, 0.06, 10)
    noseGeo.rotateZ(-Math.PI / 2)
    this.nose = new Mesh(noseGeo, this.noseMat)
    this.group.add(this.belt, this.beltLine, this.arrow, this.nose)
    this.disposables.push(beltGeo, beltLineGeo, arrowGeo, this.arrow.material as Material, noseGeo, this.noseMat)
  }

  private addCapsule(from: Joint3D, to: Joint3D, radius: number, len: number) {
    const geo = new CapsuleGeometry(radius, Math.max(0.001, len), 6, 14)
    const lineGeo = new CapsuleGeometry(radius + OUTLINE, Math.max(0.001, len), 6, 14)
    const m = new Mesh(geo, this.fill)
    const o = new Mesh(lineGeo, this.line)
    this.group.add(m, o)
    this.disposables.push(geo, lineGeo)
    this.segments.push({ from, to, meshes: [m, o], kind: 'capsule' })
  }

  private addSphere(from: Joint3D, to: Joint3D, at: number, radius: number) {
    const geo = new SphereGeometry(radius, 20, 14)
    const lineGeo = new SphereGeometry(radius + OUTLINE, 20, 14)
    const m = new Mesh(geo, this.fill)
    const o = new Mesh(lineGeo, this.line)
    this.group.add(m, o)
    this.disposables.push(geo, lineGeo)
    this.segments.push({ from, to, at, meshes: [m, o], kind: 'sphere' })
  }

  private addFoot(from: Joint3D, to: Joint3D, radius: number, len: number) {
    // 足は上下に平たい箱：つま先の向きがはっきり見える
    const geo = new BoxGeometry(radius * 2.1, len + radius, radius * 1.3)
    const lineGeo = new BoxGeometry(radius * 2.1 + OUTLINE * 2, len + radius + OUTLINE * 2, radius * 1.3 + OUTLINE * 2)
    const m = new Mesh(geo, this.fill)
    const o = new Mesh(lineGeo, this.line)
    this.group.add(m, o)
    this.disposables.push(geo, lineGeo)
    this.segments.push({ from, to, meshes: [m, o], kind: 'foot' })
  }

  setStyle(focus: boolean, palette: Palette) {
    this.fill.color = new Color(focus ? palette.focus : palette.other)
    this.line.color = new Color(focus ? palette.focusLine : palette.otherLine)
    this.noseMat.color = this.line.color
    this.arrow.visible = focus
  }

  update(fig: Figure3D) {
    const j = fig.joints
    const v = (p: Vec3) => new Vector3(p[0], p[1], p[2])
    const q = new Quaternion()
    const m = new Matrix4()
    for (const seg of this.segments) {
      const a = v(j[seg.from])
      const b = v(j[seg.to])
      if (seg.kind === 'sphere') {
        const p = a.clone().lerp(b, seg.at ?? 0)
        for (const mesh of seg.meshes) mesh.position.copy(p)
        continue
      }
      const dir = b.clone().sub(a)
      if (dir.lengthSq() < 1e-10) continue
      dir.normalize()
      const mid = a.clone().add(b).multiplyScalar(0.5)
      if (seg.kind === 'foot') {
        // 足の箱：長さ方向＝つま先、厚さ方向＝なるべく上
        const side = new Vector3().crossVectors(dir, Y)
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
        side.normalize()
        const up = new Vector3().crossVectors(side, dir).normalize()
        m.makeBasis(side, dir, up)
        q.setFromRotationMatrix(m)
        // 箱の中心を足の甲の下へ少し下げる
        mid.addScaledVector(up, -0.015)
      } else {
        q.setFromUnitVectors(Y, dir)
      }
      for (const mesh of seg.meshes) {
        mesh.position.copy(mid)
        mesh.quaternion.copy(q)
      }
    }
    // 帯：背骨に垂直な輪
    const hip = v(j.hip)
    const spine = v(j.neck).sub(hip).normalize()
    const beltPos = hip.clone().addScaledVector(spine, 0.03)
    const beltQ = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), spine)
    for (const mesh of [this.belt, this.beltLine]) {
      mesh.position.copy(beltPos)
      mesh.quaternion.copy(beltQ)
    }
    // 帯の結び目の向き（腰→丹田）
    const haraDir = v(j.hara).sub(hip).normalize()
    this.arrow.position.copy(v(j.hara)).addScaledVector(haraDir, 0.04)
    this.arrow.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), haraDir)
    // 鼻（顔の向き）
    const head = v(j.head)
    const face = v(j.nose).sub(head).normalize()
    this.nose.position.copy(head).addScaledVector(face, (this.body.radii.head ?? 0.105) + 0.012)
    this.nose.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), face)
  }

  dispose() {
    for (const d of this.disposables) d.dispose()
  }
}

// ---- 床（畳）と影 ----

function tatamiTexture(palette: Palette, sizeX: number, sizeZ: number) {
  const px = 128 // 1m あたり
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sizeX * px)
  canvas.height = Math.round(sizeZ * px)
  const g = canvas.getContext('2d')!
  g.fillStyle = palette.floor
  g.fillRect(0, 0, canvas.width, canvas.height)
  // 畳の目（い草の向き）をごく薄く
  g.globalAlpha = 0.18
  g.strokeStyle = palette.floorLine
  g.lineWidth = 1
  for (let y = 0; y < canvas.height; y += 5) {
    g.beginPath()
    g.moveTo(0, y + 0.5)
    g.lineTo(canvas.width, y + 0.5)
    g.stroke()
  }
  // 畳の縁：1.82m×0.91m を横向きに並べ、列ごとに半畳ずらす（道場の敷き方の一つ）
  g.globalAlpha = 1
  g.lineWidth = 3
  g.strokeStyle = palette.floorLine
  const w = 1.82 * px
  const h = 0.91 * px
  for (let row = 0; row * h < canvas.height + h; row++) {
    const y = row * h
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(canvas.width, y)
    g.stroke()
    const shift = row % 2 ? w / 2 : 0
    for (let x = -shift; x < canvas.width + w; x += w) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x, y + h)
      g.stroke()
    }
  }
  // 周りを和紙の地に溶かす
  g.globalCompositeOperation = 'destination-in'
  const grad = g.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.55)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, canvas.width, canvas.height)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function shadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const g = canvas.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(26,26,26,0.5)')
  grad.addColorStop(1, 'rgba(26,26,26,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new CanvasTexture(canvas)
}

// ---- 本体 ----

export function createRenderer3D(canvas: HTMLCanvasElement, body: Body3D, bounds: { min: Vec3; max: Vec3 }, palette: Palette): Renderer3D {
  // 画素密度の高い画面（1.5倍以上。スマホのほぼすべて）では、それ自体がなめらかなので MSAA を省いて描く手間を減らす
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const renderer = new WebGLRenderer({ canvas, antialias: dpr < 1.5, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(dpr)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)

  const scene = new Scene()
  scene.add(new HemisphereLight('#fffaf0', '#b9ae98', 2.2))
  const sun = new DirectionalLight('#ffffff', 1.6)
  sun.position.set(-2, 4, 3)
  scene.add(sun)

  // 床：技の範囲より一回り広い畳
  const sizeX = Math.max(5.5, bounds.max[0] - bounds.min[0] + 2.5)
  const sizeZ = Math.max(3.6, bounds.max[2] - bounds.min[2] + 2.2)
  const floorTex = tatamiTexture(palette, sizeX, sizeZ)
  const floorGeo = new PlaneGeometry(sizeX, sizeZ)
  floorGeo.rotateX(-Math.PI / 2)
  const floor = new Mesh(floorGeo, new MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }))
  floor.position.set((bounds.min[0] + bounds.max[0]) / 2, 0, (bounds.min[2] + bounds.max[2]) / 2)
  floor.renderOrder = -2
  scene.add(floor)

  const shadowTex = shadowTexture()
  const shadowGeo = new PlaneGeometry(1, 1)
  shadowGeo.rotateX(-Math.PI / 2)
  const makeShadow = () => {
    const s = new Mesh(shadowGeo, new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }))
    s.renderOrder = -1
    scene.add(s)
    return s
  }

  const gradient = toonGradient()
  const figures: Record<Role, FigureMesh> = { tori: new FigureMesh(body, gradient, palette.shu), uke: new FigureMesh(body, gradient, palette.shu) }
  const shadows: Record<Role, Mesh> = { tori: makeShadow(), uke: makeShadow() }
  scene.add(figures.tori.group, figures.uke.group)

  const camera = new PerspectiveCamera(30, 1000 / 600, 0.05, 80)
  let width = 1
  let height = 1

  function placeShadow(shadow: Mesh, fig: Figure3D) {
    // 胴の真下に、胴の向きに沿って伸びる楕円の影
    const j = fig.joints
    const hx = (j.hip[0] + j.neck[0]) / 2
    const hz = (j.hip[2] + j.neck[2]) / 2
    const dx = j.neck[0] - j.hip[0]
    const dz = j.neck[2] - j.hip[2]
    const flat = Math.hypot(dx, dz)
    shadow.position.set(hx, 0.003, hz)
    shadow.rotation.set(0, -Math.atan2(dz, dx), 0)
    shadow.scale.set(0.55 + flat, 1, 0.55)
  }

  function place(s: Scene3D, view: Role, cam: Cam, zoom: Zoom) {
    for (const role of ['tori', 'uke'] as const) {
      figures[role].setStyle(role === view, palette)
      figures[role].update(s[role])
      placeShadow(shadows[role], s[role])
    }
    camera.fov = cam.fov
    camera.aspect = cam.aspect
    camera.position.set(...cam.eye)
    camera.up.set(...cam.up)
    camera.lookAt(...cam.target)
    // 拡大：画面上の点を中心に s 倍（camera.ts の project と同じ）
    if (zoom.s > 1.0001) {
      const w = width / zoom.s
      const h = height / zoom.s
      camera.setViewOffset(width, height, zoom.cx * width * (1 - 1 / zoom.s), zoom.cy * height * (1 - 1 / zoom.s), w, h)
    } else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }

  const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

  return {
    async warmUp(s: Scene3D, view: Role, cam: Cam) {
      place(s, view, cam, { s: 1, cx: 0.5, cy: 0.5 })
      // 材料（＝シェーダーの組み立て）ごとに、その材料の物だけを見える状態にして compile し、
      // 1画素だけ描いて図形のデータも GPU へ送っておく。間で手を離す（1回の長い処理にしない）
      const all: Mesh[] = []
      scene.traverse((o) => {
        if ((o as Mesh).isMesh) all.push(o as Mesh)
      })
      const kinds = new Map<string, Mesh[]>()
      for (const m of all) {
        const mat = m.material as Material
        const key = `${mat.type}:${mat.side}:${'map' in mat && mat.map ? 'map' : ''}`
        kinds.set(key, [...(kinds.get(key) ?? []), m])
      }
      const was = new Map(all.map((m) => [m, m.visible]))
      const viewport = renderer.getViewport(new Vector4())
      for (const group of kinds.values()) {
        for (const m of all) m.visible = false
        for (const m of group) m.visible = true
        renderer.compile(scene, camera)
        renderer.setViewport(0, 0, 1, 1)
        renderer.render(scene, camera)
        renderer.setViewport(viewport)
        await nextTask()
      }
      for (const [m, visible] of was) m.visible = visible
    },
    update(s: Scene3D, view: Role, cam: Cam, zoom: Zoom) {
      place(s, view, cam, zoom)
      renderer.render(scene, camera)
    },
    resize(w: number, h: number) {
      width = Math.max(1, Math.round(w))
      height = Math.max(1, Math.round(h))
      renderer.setSize(width, height, false)
    },
    dispose() {
      figures.tori.dispose()
      figures.uke.dispose()
      for (const d of [floorTex, floorGeo, floor.material as Material, shadowTex, shadowGeo, shadows.tori.material as Material, shadows.uke.material as Material, gradient]) d.dispose()
      renderer.dispose()
    },
  }
}
