let model,
    mixer,
    skelHelper,
    modelInterspects = [],
    mouse,
    shaker,
    raycaster,
    clock = new THREE.Clock();

class BoneShaker {
    constructor(raycaster, camera, modelInterspects, skelHelper) {
        this.modelInterspects = modelInterspects;
        this.raycaster = raycaster;
        this.camera = camera;
        this.modelInterspects = modelInterspects;
        this.skelHelper = skelHelper;
        this.mouse = new THREE.Vector2();
        this.inperspectionSphere = new THREE.Sphere();
        this.inperspectionPlane = new THREE.Plane();
        this.intersectedPoint = null;
        this.boneInitQuat = [];
        this.mixer = null;
    }

    setCoords(mouseEvent) {
        this.mouse.x =
            (mouseEvent.offsetX / renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y =
            -(mouseEvent.offsetY / renderer.domElement.clientHeight) * 2 + 1;
    }

    selectBone(closestBone, bonesByDistance) {
        let bone;
        if (/Right(Hand|(Fore)?Arm)/.test(closestBone.name)) {
            bone = this.skelHelper.bones.find(o => /RightArm/.test(o.name));
        } else if (/Left(Hand|(Fore)?Arm)/.test(closestBone.name)) {
            bone = this.skelHelper.bones.find(o => /LeftArm/.test(o.name));
        }
        return bone;
    }

    raycastBone() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = raycaster.intersectObjects(this.modelInterspects);

        if (!intersects.length) return;

        this.intersectedPoint = intersects[0].point;

        const bonesByDistance = this.skelHelper.bones
            .map(bone => {
                const position = new THREE.Vector3();
                bone.getWorldPosition(position);
                return { name: bone.name, worldPosition: position };
            })
            .sort((a, b) =>
                a.worldPosition.distanceTo(this.intersectedPoint) >
                b.worldPosition.distanceTo(this.intersectedPoint)
                    ? 1
                    : -1
            );

        const closestBone = bonesByDistance[0];

        return this.selectBone(closestBone, bonesByDistance);
    }

    initMove(mouseEvent) {
        if (this.bone) return this.doMove(mouseEvent);

        this.setCoords(mouseEvent);
        this.bone = this.raycastBone();

        if (!this.bone) return;

        this.bone.getWorldPosition(this.inperspectionSphere.center);
        const spherePos = this.inperspectionSphere.center;
        this.inperspectionSphere.radius = spherePos.distanceTo(
            this.intersectedPoint
        );

        this.inperspectionPlane.setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(this.inperspectionPlane.normal),
            this.inperspectionSphere.center
        );

        this.boneInitQuat[this.bone.name] = this.bone.quaternion.clone();
    }

    doMove(mouseEvent) {
        if (!this.bone) return;

        this.setCoords(mouseEvent);
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const sphereDot = new THREE.Vector3();
        this.raycaster.ray.intersectSphere(this.inperspectionSphere, sphereDot);

        if (!sphereDot.length())
            this.raycaster.ray.intersectPlane(
                this.inperspectionPlane,
                sphereDot
            );

        const q = new THREE.Quaternion(),
            v1 = new THREE.Vector3()
                .subVectors(
                    this.intersectedPoint,
                    this.inperspectionSphere.center
                )
                .normalize(),
            v2 = new THREE.Vector3()
                .subVectors(sphereDot, this.inperspectionSphere.center)
                .normalize();
        q.setFromUnitVectors(v1, v2)
            .fromArray(
                /Right/.test(this.bone.name)
                    ? [-q.y, q.x, q.z, -q.w]
                    : [q.y, q.x, q.z, q.w]
            )
            .normalize()
            .multiply(this.boneInitQuat[this.bone.name]);
        this.bone.quaternion.copy(q);
        //this.animateQuaternion(q, 0.1);
    }

    endMove() {
        if (!this.bone) return;
        this.animateQuaternion(this.boneInitQuat[this.bone.name], 0.5);
        this.bone = null;
    }

    animateQuaternion(quaternion, duration) {
        if (!this.mixer) {
            this.bone.quaternion.copy(quaternion);
            return;
        }
        const animation = new THREE.AnimationClip(null, duration, [
            new THREE.QuaternionKeyframeTrack(
                this.bone.name + ".quaternion",
                [0, duration],
                this.bone.quaternion.toArray().concat(quaternion.toArray())
            )
        ]);
        const clipAction = this.mixer.clipAction(animation);
        clipAction.clampWhenFinished = true;
        clipAction.setLoop(THREE.LoopOnce, 1);
        clipAction.play();
    }
}

function onMouseDown(event) {
    event.preventDefault();
    console.log(`mouse down ${event.offsetX}; ${event.offsetY}`);
    shaker.initMove(event);
}

function onTouchStart(event) {
    event.preventDefault();
    var rect = event.target.getBoundingClientRect();
    event.offsetX = event.touches[0].pageX - rect.left;
    event.offsetY = event.touches[0].pageY - rect.top;
    onMouseDown(event);
}

function onMouseMove(event) {
    event.preventDefault();
    console.log(`mouse move ${event.offsetX}; ${event.offsetY}`);
    shaker.doMove(event);
}

function onTouchMove(event) {
    event.preventDefault();
    var rect = event.target.getBoundingClientRect();
    event.offsetX = event.touches[0].pageX - rect.left;
    event.offsetY = event.touches[0].pageY - rect.top;
    onMouseMove(event);
}

function onMouseUp(event) {
    event.preventDefault();
    console.log(`mouse up`);
    shaker.endMove();
}

const events = {
    mousedown: onMouseDown,
    touchstart: onTouchStart,
    mousemove: onMouseMove,
    touchmove: onTouchMove,
    mouseup: onMouseUp,
    touchend: onMouseUp,
    touchcancel: onMouseUp
};

// XXX s.yaglov disable events in editor
//if (window.controller) {
for (let [event, listener] of Object.entries(events)) {
    renderer.domElement.addEventListener(event, listener, false);
}
//}

new THREE.GLTFLoader().load(page_object_params.vars.url, function(gltf) {
    console.log("loaded gltf:", gltf);

    const model = gltf.scene;

    model.traverse(function(o) {
        if (o.isMesh) o.castShadow = true;
        if (o.isSkinnedMesh) modelInterspects.push(o);
    });

    mixer = new THREE.AnimationMixer(model);

    skelHelper = new THREE.SkeletonHelper(model);
    skelHelper.material.linewidth = 3;
    skelHelper.visible = false;
    model.add(skelHelper);

    raycaster = new THREE.Raycaster();

    shaker = new BoneShaker(raycaster, camera, modelInterspects, skelHelper);
    shaker.mixer = mixer;

    resolve({
        mesh: model,
        animate() {
            mixer.update(clock.getDelta());
        },
        destroy() {
            for (let [event, listener] of Object.entries(events)) {
                renderer.domElement.removeEventListener(event, listener, false);
            }
        }
    });
});
