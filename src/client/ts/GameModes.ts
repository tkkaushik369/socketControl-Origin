import * as THREE from 'three'
import DemoClient from "./DemoClient"
import * as Controls from './Controls';

export class GameModeBase {
	public demo: DemoClient | undefined
	public keymap: { [id: string]: any } = {}

	init() { }
	update() { }

	handleAction(event: any, key: any, value: any) {
		if (this.demo != undefined) {
			key = key.toLowerCase();

			if (key == 't' && value == true) {
				if (this.demo.timeScaleTarget < 0.5) {
					this.demo.timeScaleTarget = 1;
				}
				else {
					this.demo.timeScaleTarget = 0.3;
				}
			}
		}
	}

	handleScroll(event: any, value: any) { }
	handleMouseMove(event: any, deltaX: any, deltaY: any) { }

	checkIfWorldIsSet() {
		if (this.demo === undefined) {
			console.error('Calling gameMode init() without having specified gameMode\'s world first: ' + this);
		}
	}

	scrollTheTimeScale(scrollAmount: number) {
		if (this.demo != undefined) {
			// Changing time scale with scroll wheel
			const timeScaleBottomLimit = 0.003;
			const timeScaleChangeSpeed = 1.3;

			if (scrollAmount > 0) {
				this.demo.timeScaleTarget /= timeScaleChangeSpeed;
				if (this.demo.timeScaleTarget < timeScaleBottomLimit) this.demo.timeScaleTarget = 0;
			}
			else {
				this.demo.timeScaleTarget *= timeScaleChangeSpeed;
				if (this.demo.timeScaleTarget < timeScaleBottomLimit) this.demo.timeScaleTarget = timeScaleBottomLimit;
				this.demo.timeScaleTarget = Math.min(this.demo.timeScaleTarget, 1);
				if (this.demo.settings.Time_Scale > 0.9) this.demo.settings.Time_Scale *= timeScaleChangeSpeed;
			}
		}
	}

}

export class FreeCameraControls extends GameModeBase {
	private previousGameMode: any
	private movementSpeed: number
	public controls: { [id: string]: any }

	constructor(previousGameMode: any) {
		super();

		// Remember previous game mode to return to when pressing shift + C
		this.previousGameMode = previousGameMode;

		this.movementSpeed = 0.06;

		// Keymap
		this.keymap = {
			'w': { action: 'forward' },
			's': { action: 'back' },
			'a': { action: 'left' },
			'd': { action: 'right' },
			'e': { action: 'up' },
			'q': { action: 'down' },
			'shift': { action: 'fast' }
		};

		this.controls = {
			forward: new Controls.LerpControl(),
			left: new Controls.LerpControl(),
			right: new Controls.LerpControl(),
			up: new Controls.LerpControl(),
			back: new Controls.LerpControl(),
			down: new Controls.LerpControl(),
			fast: new Controls.LerpControl()
		};
	}

	init() {
		this.checkIfWorldIsSet();
		if (this.demo != undefined) {
			this.demo.cameraController.target.copy(this.demo.camera.position);
			this.demo.cameraController.setRadius(0);
			this.demo.cameraDistanceTarget = 0.001;
			this.demo.directionalLight.target = this.demo.camera;
		}
	}

	handleAction(event: any, key: any, value: any) {
		super.handleAction(event, key, value);
		if (this.demo != undefined) {
			// Shift modifier fix
			key = key.toLowerCase();

			/* if(key == 'f' && value == true) 
			{
				let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.demo.camera.quaternion);
				let ball = new Object();
				ball.setPhysics(new ObjectPhysics.Sphere({
					mass: 1,
					radius: 0.3,
					position: new CANNON.Vec3(
											  this.world.camera.position.x,
											  this.world.camera.position.y,
											  this.world.camera.position.z,
											  ).vadd(new CANNON.Vec3(
																	 forward.x,
																	 forward.y,
																	 forward.z,
																	 ))
				}));
				ball.setModelFromPhysicsShape();
				this.world.add(ball);

				this.world.balls.push(ball);

				if(this.world.balls.length > 10)
				{
					this.world.remove(this.world.balls[0]);
					_.pull(this.world.balls, this.world.balls[0]);
				}
			} */

			// Turn off free cam
			if (this.previousGameMode !== undefined && key == 'c' && value == true && event.shiftKey == true) {
				this.demo.gameMode = this.previousGameMode;
				this.demo.gameMode.init();
			}
			// Is key bound to action
			else if (key in this.keymap) {

				// Get control and set it's parameters
				let control = this.controls[this.keymap[key].action];
				control.value = value;
			}
		}
	}

	handleScroll(event: MouseEvent, value: number) {
		this.scrollTheTimeScale(value);
	}

	handleMouseMove(event: MouseEvent, deltaX: number, deltaY: number) {
		if (this.demo != undefined) this.demo.cameraController.move(deltaX, deltaY);
	}

	update() {
		if (this.demo != undefined) {
			// Make light follow camera (for shadows)
			/* this.demo.directionalLight.position.set(
				this.demo.camera.position.x + this.demo.sun.x * 15,
				this.demo.camera.position.y + this.demo.sun.y * 15,
				this.demo.camera.position.z + this.demo.sun.z * 15
			); */

			// Lerp all controls
			for (let key in this.controls) {
				let ctrl = this.controls[key];
				ctrl.floatValue = THREE.MathUtils.lerp(ctrl.floatValue, +ctrl.value, 0.3);
			}

			// Set fly speed
			let speed = this.movementSpeed * (this.controls.fast.value ? 5 : 1);

			let up = new THREE.Vector3(0, 1, 0);
			let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.demo.camera.quaternion);
			let right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.demo.camera.quaternion);

			this.demo.cameraController.target.add(forward.multiplyScalar(speed * (this.controls.forward.floatValue - this.controls.back.floatValue)));
			this.demo.cameraController.target.add(right.multiplyScalar(speed * (this.controls.right.floatValue - this.controls.left.floatValue)));
			this.demo.cameraController.target.add(up.multiplyScalar(speed * (this.controls.up.floatValue - this.controls.down.floatValue)));
		}
	}
}
// export class CharacterControls extends GameModeBase { }