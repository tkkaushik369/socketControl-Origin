import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import * as Utility from '../Utils/Utility'
import CannonUtils from '../Utils/cannonUtils'

export class Sphere {

	public options: { [id: string]: any }
	public physical: CANNON.Body

	constructor(options: { [id: string]: any }) {
		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			radius: 0.3,
			friction: 0.3
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = new CANNON.Sphere(options.radius)
		shape.material = mat

		let physSphere = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape
		})
		physSphere.material = mat

		this.physical = physSphere;
	}

	private getVisualModel(options: { [id: string]: any }) {
		let defaults = {
			visible: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let geometry = new THREE.SphereGeometry(this.options.radius)
		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let visualSphere = new THREE.Mesh(geometry, material)
		visualSphere.visible = options.visible

		if (!options.wireframe) {
			visualSphere.castShadow = true
			visualSphere.receiveShadow = true
		}

		return visualSphere
	}
}

export class Box {

	public options: { [id: string]: any }
	public physical: CANNON.Body

	constructor(options: {
		[id: string]: any
	}) {
		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			size: new CANNON.Vec3(0.3, 0.3, 0.3),
			quaternion: new CANNON.Quaternion(),
			friction: 0.3
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = new CANNON.Box(options.size)
		shape.material = mat

		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			quaternion: options.quaternion,
			shape: shape
		})
		physBox.material = mat

		this.physical = physBox
	}

	private getVisualModel(options: { [id: string]: any }) {
		let defaults = {
			visible: true,
			wireframe: true
		}
		options = Utility.setDefaults(options, defaults)

		let geometry = new THREE.BoxGeometry(this.options.size.x * 2, this.options.size.y * 2, this.options.size.z * 2)
		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let visualBox = new THREE.Mesh(geometry, material)
		visualBox.visible = options.visible

		if (!options.wireframe) {
			visualBox.castShadow = true
			visualBox.receiveShadow = true
		}

		return visualBox
	}
}

export class Capsule {
	public options: {
		[id: string]: any
	}
	public physical: CANNON.Body

	constructor(options: { [id: string]: any }) {
		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			height: 0.5,
			radius: 0.3,
			segments: 8,
			friction: 0.3
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let physicalCapsule = new CANNON.Body({
			mass: options.mass,
			position: options.position
		})

		let sphereShape = new CANNON.Sphere(options.radius)
		physicalCapsule.material = mat
		sphereShape.material = mat

		physicalCapsule.addShape(sphereShape, new CANNON.Vec3(0, 0, 0))
		physicalCapsule.addShape(sphereShape, new CANNON.Vec3(0, options.height / 2, 0))
		physicalCapsule.addShape(sphereShape, new CANNON.Vec3(0, -options.height / 2, 0))

		this.physical = physicalCapsule
	}

	getVisualModel(options: { [id: string]: any }) {
		let defaults = {
			visible: true,
			wireframe: true
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let geometry = Utility.createCapsuleGeometry(this.options.radius, this.options.height, this.options.segments)
		let visualCapsule = new THREE.Mesh(geometry, material)
		visualCapsule.visible = options.visible
		if (!options.wireframe) {
			visualCapsule.castShadow = true
			visualCapsule.receiveShadow = true
		}

		return visualCapsule;
	}
}

export class Convex {
	public options: { [id: string]: any }
	public mesh: THREE.Mesh
	public physical: CANNON.Body

	constructor(mesh: THREE.Mesh, options: { [id: string]: any }) {
		this.mesh = mesh.clone()

		let defaults = {
			mass: 0,
			position: mesh.position,
			friction: 0.3
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = this.options.friction

		let shape = CannonUtils.CreateConvexPolyhedron(this.mesh.geometry)
		shape.material = mat

		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape
		})
		physBox.material = mat

		this.physical = physBox
	}

	getVisualModel(options: { [id: string]: any }) {
		let defaults = {
			visible: true,
			wireframe: true
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0xcccccc, wireframe: options.wireframe })
		let visualBox = this.mesh.clone()
		visualBox.material = material
		visualBox.visible = options.visible
		if (!options.wireframe) {
			visualBox.castShadow = true
			visualBox.receiveShadow = true
		}

		return visualBox
	}
}

export class TriMesh {

	public options: { [id: string]: any }
	public mesh: THREE.Mesh
	public physical: CANNON.Body

	constructor(mesh: THREE.Mesh, options: { [id: string]: any }) {
		this.mesh = mesh.clone()

		let defaults = {
			mass: 0,
			position: mesh.position,
			friction: 0.3
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = CannonUtils.CreateTrimesh(this.mesh.geometry)
		shape.material = mat

		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape
		})

		physBox.material = mat

		this.physical = physBox
	}

	getVisualModel(options: { [id: string]: any }) {
		let defaults = {
			visible: true,
			wireframe: true
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0xcccccc, wireframe: options.wireframe })
		let visualBox = this.mesh.clone()
		visualBox.material = material
		visualBox.visible = options.visible
		if (!options.wireframe) {
			visualBox.castShadow = true
			visualBox.receiveShadow = true
		}

		return visualBox
	}
}