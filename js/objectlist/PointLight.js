const color = parseInt(page_object_params.vars.Color ?? 0xffffff),
    intensity = parseFloat(page_object_params.vars.Intensity ?? 1),
    distance = parseFloat(page_object_params.vars.Distance ?? 0),
    decay = parseFloat(page_object_params.vars.Decay ?? 1),
    mesh = new THREE.PointLight(color, intensity, distance, decay);

let helper;

mesh.size3 = new THREE.Vector3(1, 1, 1);

resolve({
    get helper() {
        if (!helper) helper = new THREE.PointLightHelper(mesh, 1);
        return helper;
    },
    get name() {
        return [
            `${__("Color")} ${page_object_params.vars.Color}`,
            `${__("Intensity")} ${page_object_params.vars.Intensity}`,
            `${__("Distance")} ${page_object_params.vars.Distance}`,
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
