import DemoClient from "./DemoClient"

export class InputManager {

	public demo: DemoClient
	public domElement: HTMLElement
	public pointerLock: boolean
	// public isLocked: boolean

	constructor(demo: DemoClient, domElement: HTMLElement) {
		this.demo = demo
		this.domElement = domElement
		this.pointerLock = this.demo.settings.Pointer_Lock

		// Bindings for later event use
		// Mouse
		// this.boundOnMouseDown = (evt: MouseEvent) => this.onMouseDown(evt);
		// this.boundOnMouseMove = (evt: MouseEvent) => this.onMouseMove(evt);
		// this.boundOnMouseUp = (evt: MouseEvent) => this.onMouseUp(evt);
		// this.boundOnMouseWheelMove = (evt: WheelEvent) => this.onMouseWheelMove(evt);

		// Pointer lock
		// this.boundOnPointerlockChange = (evt: MouseEvent) => this.onPointerlockChange(evt);
		// this.boundOnPointerlockError = (evt: MouseEvent) => this.onPointerlockError(evt);

		// Keys
		// this.boundOnKeyDown = (evt: KeyboardEvent) => this.onKeyDown(evt);
		// this.boundOnKeyUp = (evt: KeyboardEvent) => this.onKeyUp(evt);

		// Init event listeners
		// Mouse
		// this.domElement.addEventListener("mousedown", this.boundOnMouseDown, false);
		// document.addEventListener("wheel", this.boundOnMouseWheelMove, false);
		// document.addEventListener("pointerlockchange", this.boundOnPointerlockChange, false);
		// document.addEventListener("pointerlockerror", this.boundOnPointerlockError, false);

		// Keys
		// document.addEventListener("keydown", this.boundOnKeyDown, false);
		// document.addEventListener("keyup", this.boundOnKeyUp, false);
	}

	public setPointerLock(enabled: boolean) {
		this.pointerLock = enabled;
	}

	/* onPointerlockChange(event: MouseEvent) {
		if (document.pointerLockElement === this.domElement) {
			this.domElement.addEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.addEventListener("mouseup", this.boundOnMouseUp, false);
			this.isLocked = true;
		}
		else {
			this.domElement.removeEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.removeEventListener("mouseup", this.boundOnMouseUp, false);
			this.isLocked = false;
		}
	} */

	private onPointerlockError(event: MouseEvent) {
		console.error("PointerLockControls: Unable to use Pointer Lock API");
	}

	private onMouseDown(event: MouseEvent) {
		if (this.pointerLock) {
			this.domElement.requestPointerLock();
		}
		else {
			// this.domElement.addEventListener("mousemove", this.boundOnMouseMove, false);
			// this.domElement.addEventListener("mouseup", this.boundOnMouseUp, false);
		}

		/* if (this.demo.gameMode !== undefined) {
			this.demo.gameMode.handleAction(event, 'mouse' + event.button, true);
		} */
	}

	/* onMouseMove(event: MouseEvent) {
		if (this.world.gameMode !== undefined) {
			this.world.gameMode.handleMouseMove(event, event.movementX, event.movementY);
		}
	} */

	/* onMouseUp(event: MouseEvent) {
		if (!this.pointerLock) {
			this.domElement.removeEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.removeEventListener("mouseup", this.boundOnMouseUp, false);
		}

		if (this.world.gameMode !== undefined) {
			this.world.gameMode.handleAction(event, 'mouse' + event.button, false);
		}
	} */

	/* onKeyDown(event: KeyboardEvent) {
		if (this.world.gameMode !== undefined) {
			this.world.gameMode.handleAction(event, event.key, true);
		}
	} */

	/* onKeyUp(event: KeyboardEvent) {
		if (this.world.gameMode !== undefined) {
			this.world.gameMode.handleAction(event, event.key, false);
		}
	} */

	/* onMouseWheelMove(event: WheelEvent) {
		if (this.world.gameMode !== undefined) {
			this.world.gameMode.handleScroll(event, event.deltaY);
		}
	} */
}