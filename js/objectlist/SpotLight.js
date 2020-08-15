const color = parseInt(page_object_params.vars.Color ?? 0xffffff),
    intensity = parseFloat(page_object_params.vars.Intensity ?? 1),
    distance = parseFloat(page_object_params.vars.Distance ?? 0),
    angle = parseFloat(page_object_params.vars.Angle ?? Math.PI / 3),
    penumbra = parseFloat(page_object_params.vars.Penumbra ?? 0),
    decay = parseFloat(page_object_params.vars.Decay ?? 1),
    targetPosition = (
        page_object_params.vars.Target_Position ?? [0, 0, 0]
    ).map(s => parseFloat(s)),
    mesh = new THREE.SpotLight(
        color,
        intensity,
        distance,
        angle,
        penumbra,
        decay
    );

let helper;

mesh.size3 = new THREE.Vector3(1, 1, 1);
mesh.target.position.fromArray(targetPosition);

resolve({
    get helper() {
        if (!helper) helper = new THREE.SpotLightHelper(mesh);
        return helper;
    },
    get name() {
        return [
            `${__("Color")} ${page_object_params.vars.Color}`,
            `${__("Intensity")} ${page_object_params.vars.Intensity}`,
            `${__("Distance")} ${page_object_params.vars.Distance}`,
            `${__("Angle")} ${page_object_params.vars.Angle}`,
            `${__("Penumbra")} ${page_object_params.vars.Penumbra}`,
            `${__("Decay")} ${page_object_params.vars.Decay}`
        ].join(", ");
    },
    mesh,
    animate() {
        /* noop */
    },
    destroy() {
        //mesh.dispose();
        //if (helper) helper.dispose();
    }
});
