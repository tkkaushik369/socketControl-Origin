import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as Utility from "./Utils/Utility"

export default class DemoServer {
	public world: CANNON.World

	private settings: { [id: string]: any }
	private scenario: Function[]
	public allBodies: { [id: string]: CANNON.Body }

	private lastCallTime: number
	private resetCallTime: boolean

	constructor() {
		// Bind Functions
		this.updatePhysics = this.updatePhysics.bind(this)

		// Settings
		this.settings = {
			stepFrequency: 60,
		}
		this.lastCallTime = 0
		this.resetCallTime = false

		// Scenario
		this.scenario = []
		this.allBodies = {}

		// Init cannon.js
		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.8, 0)

		setInterval(this.updatePhysics, (1 / this.settings.stepFrequency) * 1000)
	}

	public addScene(scene: THREE.Scene) {
		var listMesh: any[] = []
		scene.children.forEach((child: any) => {
			if (child.isMesh) {
				listMesh.push(child)
			}
		})

		listMesh.forEach((child: any) => {
			let body = Utility.getBodyFromMesh(child)
			if ((body !== undefined) && (child.userData.name !== undefined)) {
				this.addBody(this.world, body, child.userData.name)
				body.position.x = child.position.x
				body.position.y = child.position.y
				body.position.z = child.position.z
				body.quaternion.x  = child.quaternion.x
				body.quaternion.y  = child.quaternion.y
				body.quaternion.z  = child.quaternion.z
				body.quaternion.w  = child.quaternion.w
			}
		})
	}

	private addBody(world: CANNON.World, body: CANNON.Body, name: string) {
		this.allBodies[name] = body
		world.addBody(body)
	}

	private removeBody(world: CANNON.World, name: string) {
		if (this.allBodies[name] === undefined) return
		world.removeBody(this.allBodies[name])
		delete this.allBodies[name]
	}

	public addScenario(title: string, initfunc: Function) {
		this.scenario.push(initfunc)
	}

	public buildScene(inx: number) {
		// Remove all visuals
		this.removeAllPhysics();

		if (inx === -1) return
		// Run the user defined "build scene" function
		this.scenario[inx]()
	}

	private removeAllPhysics() {
		Object.keys(this.allBodies).forEach((p) => {
			this.removeBody(this.world, p)
		});
	}

	private updatePhysics() {
		// Step world
		const timeStep = 1 / this.settings.stepFrequency

		const now = performance.now() / 1000

		if (!this.lastCallTime) {
			// last call time not saved, cant guess elapsed time. Take a simple step.
			this.world.step(timeStep)
			this.lastCallTime = now
			return
		}

		let timeSinceLastCall = now - this.lastCallTime
		if (this.resetCallTime) {
			timeSinceLastCall = 0
			this.resetCallTime = false
		}

		this.world.step(timeStep, timeSinceLastCall, this.settings.maxSubSteps)

		this.lastCallTime = now
	}
}