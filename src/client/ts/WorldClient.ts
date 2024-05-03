import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import * as CANNON from 'cannon-es'
import AppClient from '../client'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as GameModes from './GameModes';
import { CameraController } from './CameraController';
import { InputManager } from './InputManager';
import CannonDebugRenderer from '../../server/ts/utils/cannonDebugRenderer'
import { WorldObject } from '../../server/ts/WorldObjects/WorldObject'
import * as Utility from '../../server/ts/Utils/Utility'

export default class WorldClient {
	private appClient: AppClient
	private parent: HTMLElement
	public scene: THREE.Scene
	public world: CANNON.World
	private cannonDebugRenderer: CannonDebugRenderer | undefined
	private renderer2D: CSS2DRenderer
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
	public allMeshs: { [id: string]: THREE.Object3D }
	public allLabels: { [id: string]: CSS2DObject }
	public allBodies: { [id: string]: CANNON.Body }
	public allBalls: any[]
	private scenarioFolder: any

	public changeSceneCallBack: Function | undefined
	public animateCallBack: Function | undefined

	constructor(appClient: AppClient, parent?: HTMLElement) {
		this.appClient = appClient
		if (parent !== undefined) this.parent = parent
		else this.parent = document.body

		// Bind Functions
		this.animate = this.animate.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)

		// Scenario
		this.scenario = []
		this.allMeshs = {}
		this.allLabels = {}
		this.allBodies = {}
		this.allBalls = []

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = new THREE.Fog(0x222222, 1000, 2000)

		// World
		this.world = new CANNON.World()
		this.world.gravity.set(0, -9.8, 0)

		// Renderer
		this.renderer2D = new CSS2DRenderer()
		this.renderer2D.setSize(window.innerWidth, window.innerHeight)
		this.renderer2D.domElement.style.position = 'absolute'
		this.renderer2D.domElement.style.top = '0px'
		// this.renderer2D.domElement.style.zIndex = '-1'
		this.parent.appendChild(this.renderer2D.domElement)

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.setClearColor(this.scene.fog.color, 0.1)
		this.parent.appendChild(this.renderer.domElement)


		// Lights
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.scene.add(this.ambientLight)

		const lightVector = new THREE.Vector3(24, 30, 24)
		this.spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2, 1, 2)
		this.spotLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		this.spotLight.target.position.set(0, 0, 0)
		this.spotLight.castShadow = true
		this.spotLight.shadow.camera.fov = 30
		this.spotLight.shadow.camera.near = 500
		this.spotLight.shadow.camera.far = 4000
		this.spotLight.shadow.bias = -0.0001
		this.spotLight.shadow.mapSize.width = 2048
		this.spotLight.shadow.mapSize.height = 2048
		this.scene.add(this.spotLight)

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 2)
		this.directionalLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		this.directionalLight.target.position.set(0, 0, 0)
		this.directionalLight.castShadow = true
		this.scene.add(this.directionalLight)

		// Camera
		this.camera = new THREE.PerspectiveCamera(24, window.innerWidth / window.innerHeight, 1, 1000)
		this.camera.position.set(0, 20, 30)
		this.camera.lookAt(0, 0, 0)

		// Helpers
		this.helpers = {}
		
		this.helpers['axesHelper'] = new THREE.AxesHelper(5)
		this.scene.add( this.helpers['axesHelper'] )

		this.helpers['gridHelper'] = new THREE.GridHelper( 10, 10 )
		this.scene.add( this.helpers['gridHelper'] )

		this.helpers['spotLight'] = new THREE.SpotLightHelper( this.spotLight )
		this.scene.add( this.helpers['spotLight'] )

		this.helpers['directionalLight'] = new THREE.DirectionalLightHelper( this.directionalLight, 1 )
		this.scene.add( this.helpers['directionalLight'] )

		this.clock = new THREE.Clock();
		this.renderDelta = 0;

		// Settings
		this.settings = {
			PointerLock: true,
			MouseSensitivity: 0.2,
			TimeScale: 1,
			DebugPhysics: false,
		}

		// Changing time scale with scroll wheel
		this.timeScaleTarget = 1;
		this.cameraDistanceTarget = 1.6;
		this.cameraController = new CameraController(this.camera, this.settings.MouseSensitivity, this.settings.MouseSensitivity * 0.7);
		this.gameMode = new GameModes.FreeCameraControls(undefined)
		this.gameMode.worldClient = this
		this.gameMode.init()
		this.inputManager = new InputManager(this, this.parent);

		// GUI
		const pointLockFunc = (enabled: boolean) => { this.inputManager.setPointerLock(enabled); }
		const mouseSensitivityFunc = (value: number) => { this.cameraController.setSensitivity(value, value * 0.8); }
		const timeScaleFunc = (value: number) => { this.settings.timeScaleTarget = value; }
		const debugPhysicsFunc = (enabled: boolean) => {
			if (enabled) { this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world); }
			else {
				if (this.cannonDebugRenderer !== undefined) this.cannonDebugRenderer.clearMeshes();
				this.cannonDebugRenderer = undefined;
			}
		}

		this.gui = new GUI({ width: 140 })

		// Input Folder
		let inputFolder = this.gui.addFolder('Input')
		inputFolder.add(this.settings, 'PointerLock').onChange(pointLockFunc);
		inputFolder.add(this.settings, 'MouseSensitivity', 0.01, 0.5, 0.01).onChange(mouseSensitivityFunc).name("Mouse")
		inputFolder.close()

		// Graphics
		let graphicsFolder = this.gui.addFolder('Rendering');
		graphicsFolder.add(this.settings, 'TimeScale', 0, 1).listen().onChange(timeScaleFunc);
		graphicsFolder.close()

		// Debug
		let debugFolder = this.gui.addFolder('Debug');
		debugFolder.add(this.settings, 'DebugPhysics').onChange(debugPhysicsFunc);
		debugFolder.close()

		// Scene Picker Folder
		this.scenarioFolder = this.gui.addFolder('Scenario')
		this.scenarioFolder.add({ ["Reset"]: () => this.changeScene(-1, true) }, "Reset")
		this.scenarioFolder.open()

		{
			// run all Functions
			pointLockFunc(this.settings.PointerLock)
			mouseSensitivityFunc(this.settings.MouseSensitivity)
			timeScaleFunc(this.settings.TimeScale)
			debugPhysicsFunc(this.settings.DebugPhysics)
		}

		// Events
		window.addEventListener('resize', this.onWindowResize, false);

		this.animate();
	}

	public setGameMode(gameMode: GameModes.GameModeBase) {
		gameMode.worldClient = this;
		this.gameMode = gameMode;
		gameMode.init();
	}

	public addScene(scene: THREE.Scene) {
		var listMesh: any[] = []
		scene.children.forEach((child: any) => {
			if (child.isMesh) {
				listMesh.push(child)
			}
		})

		listMesh.forEach((child: any) => {
			if (child.userData.name !== undefined) {
				if (child.userData.visible === "false")
					child.visible = false
				this.addMesh(this.scene, child, child.userData.name)
			}
			let body = Utility.getBodyFromMesh(child)
			if ((body !== undefined) && (child.userData.name !== undefined)) {
				this.addBody(this.world, body, child.userData.name)
				body.position.x = child.position.x
				body.position.y = child.position.y
				body.position.z = child.position.z
				body.quaternion.x = child.quaternion.x
				body.quaternion.y = child.quaternion.y
				body.quaternion.z = child.quaternion.z
				body.quaternion.w = child.quaternion.w
			}
		})
	}

	public addMesh(scene: THREE.Scene, mesh: THREE.Object3D, name: string) {
		this.allMeshs[name] = mesh
		this.allMeshs[name].castShadow = true
		this.allMeshs[name].receiveShadow = true
		scene.add(this.allMeshs[name])
	}

	public removeMesh(scene: THREE.Scene, name: string) {
		if (this.allMeshs[name] === undefined) return
		scene.remove(this.allMeshs[name])
		delete this.allMeshs[name]
	}

	public addLabel(obj: THREE.Object3D, label: CSS2DObject, name: string) {
		this.allLabels[name] = label
		obj.add(this.allLabels[name])
	}

	public removeLabel(name: string) {
		if (this.allLabels[name] === undefined) return
		if (this.allMeshs[name] === undefined) return
		this.allMeshs[name].remove(this.allLabels[name])
		delete this.allLabels[name]
	}

	public addBody(world: CANNON.World, body: CANNON.Body, name: string) {
		this.allBodies[name] = body
		world.addBody(body)
	}

	public removeBody(world: CANNON.World, name: string) {
		if (this.allBodies[name] === undefined) return
		world.removeBody(this.allBodies[name])
		delete this.allBodies[name]
	}


	public addScenario(title: string, initfunc: Function) {
		this.scenario.push(initfunc)
		const index = this.scenario.length - 1

		this.scenarioFolder.add({ [title]: () => this.changeScene(index, true) }, title)
	}

	public changeScene(inx: number, call: boolean) {
		if (call && (this.changeSceneCallBack !== undefined)) this.changeSceneCallBack(inx)
		else this.buildScene(inx)
	}

	private buildScene(inx: number) {
		// Remove all visuals
		this.removeAllVisuals();
		this.removeAllPhysics();
		this.allHelper(true)

		if (inx == -1) return
		this.allHelper(false)
		// Run the user defined "build scene" function
		this.scenario[inx]()
	}

	private removeAllVisuals() {
		Object.keys(this.allMeshs).forEach((p) => {
			if(!p.includes("_player_")) this.removeMesh(this.scene, p)
		});
	}

	private removeAllPhysics() {
		Object.keys(this.allBodies).forEach((p) => {
			if(!p.includes("_player_")) this.removeBody(this.world, p)
		});
	}

	public meshUpdate(id: string, data: any) {
		const worldEnt = "world_ent_"
		if (id.includes(worldEnt)) {
			const tid = id
			let p = tid.replace(worldEnt, "")

			if (this.allMeshs[p] !== undefined) {
				this.allMeshs[p].position.x = data.position.x
				this.allMeshs[p].position.y = data.position.y
				this.allMeshs[p].position.z = data.position.z

				this.allMeshs[p].quaternion.x = data.quaternion.x
				this.allMeshs[p].quaternion.y = data.quaternion.y
				this.allMeshs[p].quaternion.z = data.quaternion.z
				this.allMeshs[p].quaternion.w = data.quaternion.w
			}

			if (this.allBodies[p] !== undefined) {
				this.allBodies[p].position.x = data.position.x
				this.allBodies[p].position.y = data.position.y
				this.allBodies[p].position.z = data.position.z

				this.allBodies[p].quaternion.x = data.quaternion.x
				this.allBodies[p].quaternion.y = data.quaternion.y
				this.allBodies[p].quaternion.z = data.quaternion.z
				this.allBodies[p].quaternion.w = data.quaternion.w
			}
		} else {
			if (this.allMeshs[id] !== undefined) {
				if (data.position !== undefined) {
					this.allMeshs[id].position.x = data.position.x
					this.allMeshs[id].position.y = data.position.y
					this.allMeshs[id].position.z = data.position.z
				}

				if (data.quaternion !== undefined) {
					this.allMeshs[id].quaternion.x = data.quaternion.x
					this.allMeshs[id].quaternion.y = data.quaternion.y
					this.allMeshs[id].quaternion.z = data.quaternion.z
					this.allMeshs[id].quaternion.w = data.quaternion.w
				}
			}
			Object.keys(this.allBodies).forEach((p) => {
				if(p.includes(id) && id.includes("_player_")) {
					if (data.position !== undefined) {
						this.allBodies[p].position.x = data.position.x
						this.allBodies[p].position.y = data.position.y
						this.allBodies[p].position.z = data.position.z
					}
					if (data.quaternion !== undefined) {
						this.allBodies[p].quaternion.x = data.quaternion.x
						this.allBodies[p].quaternion.y = data.quaternion.y
						this.allBodies[p].quaternion.z = data.quaternion.z
						this.allBodies[p].quaternion.w = data.quaternion.w
					}
				}
			});
		}
	}

	private allHelper(show: boolean) {
		Object.keys(this.helpers).forEach((p) => {
			this.helpers[p].visible = show
		})
	}

	private animate() {
		requestAnimationFrame(this.animate);

		// Measuring render time
		this.renderDelta = this.clock.getDelta();

		this.gameMode.update();

		{
			this.world.step(this.renderDelta)
			this.allBalls.forEach((p) => {
				p.update(0)
			})
		}

		// Lerp parameters
		this.cameraController.radius = THREE.MathUtils.lerp(this.cameraController.radius, this.cameraDistanceTarget, 0.1);

		// Rotate and position camera
		this.cameraController.update()
		if (this.animateCallBack !== undefined) this.animateCallBack()

		// Update cannonDebugRenderer
		if (this.settings.DebugPhysics && (this.cannonDebugRenderer !== undefined)) this.cannonDebugRenderer.update()

		this.renderer.render(this.scene, this.camera)
		this.renderer2D.render(this.scene, this.camera)
	}

	// Events
	private onWindowResize() {
		(this.camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
		(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer2D.setSize(window.innerWidth, window.innerHeight)
	}
}

