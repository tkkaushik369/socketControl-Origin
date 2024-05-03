import * as THREE from 'three'

export class WorldObject extends THREE.Object3D {

	public isWorldObject: boolean
	public model: THREE.Mesh | undefined
	public physics: any

	constructor(model: THREE.Mesh | undefined = undefined, physics: any = undefined) {
		super()

		this.isWorldObject = true

		this.model = model
		this.physics = physics
	}

	update(timeStamp: number) {
		if ((this.physics !== undefined) && (this.physics.physical !== undefined)) {
			this.position.copy(this.physics.physical.position)
			this.quaternion.copy(this.physics.physical.quaternion)
		}

		if (this.model !== undefined) {
			this.model.position.copy(this.position)
			this.model.quaternion.copy(this.quaternion)
		}
	}

	setModel(model: THREE.Mesh | undefined = undefined) {
		this.model = model
	}

	setModelFromPhysicsShape() {
		if (this.physics !== undefined) this.model = this.physics.getVisualModel({ visible: true, wireframe: false })
	}

	setPhysics(physics: any = undefined) {
		this.physics = physics
	}
}