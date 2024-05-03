import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as GameModes from './GameModes';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import CannonDebugRenderer from '../utils/cannonDebugRenderer'


export default class DemoClient {
	private parent: HTMLDivElement
	public scene: THREE.Scene
	// private world: CANNON.World
	// private cannonDebugRenderer: CannonDebugRenderer
	private renderer: THREE.WebGLRenderer
	private ambientLight: THREE.AmbientLight
	private spotLight: THREE.SpotLight
	public directionalLight: THREE.DirectionalLight
	
	public gameMode: GameModes.GameModeBase
	public timeScaleTarget: number
	public camera: THREE.Camera
	public cameraDistanceTarget: number
	public cameraController: CameraController
	private inputManager: InputManager
	private helpers: { [id: string]: THREE.Object3D }

	private clock: THREE.Clock
	private renderDelta: number
	public settings: { [id: string]: any }
	private gui: GUI
	private scenario: Function[]
	public allMesh: { [id: string]: THREE.Mesh }
	// public allBodies: { [id: string]: CANNON.Body }
	private scenarioFolder: any
	public changeSceneCallBack: Function | undefined

	constructor(parent: HTMLDivElement) {
		this.parent = parent

		// Bind Functions
		this.animate = this.animate.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)

		// Scenario
		this.scenario = []
		this.allMesh = {}
		// this.allBodies = {}

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = new THREE.Fog(0x222222, 1000, 2000)

		// World
		// this.world = new CANNON.World()
		// this.world.gravity.set(0, -9.8, 0)

		// Debug
		// this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world)

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.shadowMap.enabled = true
		// this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.setClearColor(this.scene.fog.color, 0.1)
		this.parent.appendChild(this.renderer.domElement)

		// Lights
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.01)
		this.scene.add(this.ambientLight)

		this.spotLight = new THREE.SpotLight(0xffffff, 150, 0, Math.PI / 8, 1)
		this.spotLight.position.set(-30, 40, 30)
		this.spotLight.target.position.set(0, 0, 0)
		this.spotLight.castShadow = true
		this.spotLight.shadow.camera.near = 10
		this.spotLight.shadow.camera.far = 100
		this.spotLight.shadow.camera.fov = 30
		this.spotLight.shadow.bias = -0.0001
		this.spotLight.shadow.mapSize.width = 2048
		this.spotLight.shadow.mapSize.height = 2048
		this.scene.add(this.spotLight)

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5 /*0.15*/)
		this.directionalLight.position.set(-30, 40, 30)
		this.directionalLight.target.position.set(0, 0, 0)
		this.directionalLight.castShadow = true
		this.scene.add(this.directionalLight)

		// Camera
		this.camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 5, 2000)
		this.camera.position.set(0, 20, 30)
		this.camera.lookAt(0, 0, 0)

		// Orbit controls
		/* this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls.rotateSpeed = 1.0
		this.controls.zoomSpeed = 1.2
		this.controls.enableDamping = true
		this.controls.enablePan = false
		this.controls.dampingFactor = 0.2
		this.controls.minDistance = 10
		this.controls.maxDistance = 500 */

		// Helpers
		this.helpers = {}
		this.helpers['axesHelper'] = new THREE.AxesHelper(5);
		this.scene.add(this.helpers['axesHelper']);

		this.clock = new THREE.Clock();
		this.renderDelta = 0;

		// Settings
		this.settings = {
			Pointer_Lock: true,
			Mouse_Sensitivity: 0.3,
			Time_Scale: 1,
		}
		
		// Changing time scale with scroll wheel
		this.timeScaleTarget = 1;
		this.cameraDistanceTarget = 1.6;
		this.cameraController = new CameraController(this.camera, this.settings.Mouse_Sensitivity, this.settings.Mouse_Sensitivity * 0.7);
		this.gameMode = new GameModes.FreeCameraControls(undefined)
		this.gameMode.demo = this
		this.gameMode.init()
		this.inputManager = new InputManager(this, this.renderer.domElement);
		
		// GUI
		const pointLockFunc = (enabled: boolean) => { this.inputManager.setPointerLock(enabled); }
		const mouseSensitivityFunc = (value: number) => { this.cameraController.setSensitivity(value, value * 0.8); }
		const timeScaleFunc = (value: number) => { this.settings.timeScaleTarget = value; }

		this.gui = new GUI()
		
		// Input Folder
		let inputFolder = this.gui.addFolder('Input')
		inputFolder.add(this.settings, 'Pointer_Lock').onChange(pointLockFunc);
		inputFolder.add(this.settings, 'Mouse_Sensitivity', 0.01, 0.5, 0.01).onChange(mouseSensitivityFunc)

		// Graphics
		let graphics_folder = this.gui.addFolder('Rendering');
		graphics_folder.add(this.settings, 'Time_Scale', 0, 1).listen().onChange(timeScaleFunc);
		
		// Scene Picker Folder
		this.scenarioFolder = this.gui.addFolder('Scenario')
		this.scenarioFolder.open()

		{
			// run all Functions
			pointLockFunc(this.settings.Pointer_Lock)
			mouseSensitivityFunc(this.settings.Mouse_Sensitivity)
			timeScaleFunc(this.settings.Time_Scale);
		}

		// Events
		window.addEventListener('resize', this.onWindowResize, false);

		this.animate();
	}

	public setGameMode(gameMode: GameModes.GameModeBase) {
		gameMode.demo = this;
		this.gameMode = gameMode;
		gameMode.init();
	}

	public addScene(scene: THREE.Scene) {
		var listMesh: any[] = []
		scene.traverse((child: any) => {
			if (child.isMesh) {
				listMesh.push(child)
			}
		})

		listMesh.forEach((child: any) => {
			if (child.userData.name !== undefined)
				this.addMesh(this.scene, child, child.userData.name)
			/* let body = this.getBodyFromMesh(child)
			if ((body !== undefined) && (child.userData.name !== undefined)) {
				this.addBody(this.world, body, child.userData.name)
				body.position.x = child.position.x
				body.position.y = child.position.y
				body.position.z = child.position.z
				body.quaternion.x  = child.quaternion.x
				body.quaternion.y  = child.quaternion.y
				body.quaternion.z  = child.quaternion.z
				body.quaternion.w  = child.quaternion.w
			} */
		})
	}

	private addMesh(scene: THREE.Scene, mesh: THREE.Mesh, name: string) {
		this.allMesh[name] = mesh
		scene.add(mesh)
	}

	private removeMesh(scene: THREE.Scene, name: string) {
		if (this.allMesh[name] === undefined) return
		scene.remove(this.allMesh[name])
		delete this.allMesh[name]
	}

/* 	private addBody(world: CANNON.World, body: CANNON.Body, name: string) {
		this.allBodies[name] = body
		world.addBody(body)
	} */

	/* private removeBody(world: CANNON.World, name: string) {
		if (this.allBodies[name] === undefined) return
		world.removeBody(this.allBodies[name])
		delete this.allBodies[name]
	} */


	public addScenario(title: string, initfunc: Function) {
		this.scenario.push(initfunc)
		const index = this.scenario.length - 1

		this.scenarioFolder.add({ [title]: () => this.changeScene(index, true) }, title)
	}

	public changeScene(inx: number, call: boolean) {
		this.buildScene(inx)
		if (call && (this.changeSceneCallBack !== undefined)) this.changeSceneCallBack(inx)
	}

	private buildScene(inx: number) {
		// Remove all visuals
		this.removeAllVisuals();
		// this.removeAllPhysics();

		if (inx == -1) return
		// Run the user defined "build scene" function
		this.scenario[inx]()
	}

	/* private getBodyFromMesh(mesh: THREE.Mesh): CANNON.Body | undefined {
		if (mesh.userData.physics == "box") {
			let mass = mesh.userData.mass;
			if (mass === undefined) mass = 0;
			else mass = Number(mass)
			const parameter = (mesh.geometry as THREE.BoxGeometry).parameters
			const shape = new CANNON.Box(new CANNON.Vec3(parameter.width / 2, parameter.height / 2, parameter.depth / 2))
			const body = new CANNON.Body({ mass: mass, shape: shape })
			return body
		} else if (mesh.userData.physics == "sphere") {
			let mass = mesh.userData.mass;
			if (mass === undefined) mass = 0;
			else mass = Number(mass)
			const parameter = (mesh.geometry as THREE.SphereGeometry).parameters
			const shape = new CANNON.Sphere(parameter.radius)
			const body = new CANNON.Body({ mass: mass, shape: shape })
			return body
		}
	} */

	private removeAllVisuals() {
		Object.keys(this.allMesh).forEach((p) => {
			this.removeMesh(this.scene, p)
		});
	}

	/* private removeAllPhysics() {
		Object.keys(this.allBodies).forEach((p) => {
			this.removeBody(this.world, p)
		});
	} */

	public meshUpdate(id: string, data: any) {
		const world_ent = "world_ent_"
		if (id.includes(world_ent)) {
			console.log(id, JSON.stringify(data))
			const tid = id
			let p = tid.replace(world_ent, "")
			if(this.allMesh[p] !== undefined) {
				this.allMesh[p].position.x = data.position.x
				this.allMesh[p].position.y = data.position.y
				this.allMesh[p].position.z = data.position.z
			}

			/* this.allBodies[p].position.x = data.position.x
			this.allBodies[p].position.y = data.position.y
			this.allBodies[p].position.z = data.position.z */
		}
	}

	animate() {
		requestAnimationFrame(this.animate);

		// Measuring render time
		this.renderDelta = this.clock.getDelta();

		this.gameMode.update();

		// this.controls.update()
		// Lerp parameters
		this.cameraController.radius = THREE.MathUtils.lerp(this.cameraController.radius, this.cameraDistanceTarget, 0.1);

		// Rotate and position camera
		this.cameraController.update();
		
		// this.cannonDebugRenderer.update()

		this.renderer.render(this.scene, this.camera);
	}

	// Events
	private onWindowResize() {
		(this.camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
		(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}

	public start() {
		this.buildScene(0)
	}
}

