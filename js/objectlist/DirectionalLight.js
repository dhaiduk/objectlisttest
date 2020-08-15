const color = parseInt(page_object_params.vars.Color),
    intensity = parseFloat(page_object_params.vars.Intensity),
    targetPosition = (
        page_object_params.vars.Target_Position ?? [0, 0, 0]
    ).map(s => parseFloat(s)),
    mesh = new THREE.DirectionalLight(color, intensity);

let helper;

mesh.size3 = new THREE.Vector3(1, 1, 1);
mesh.target.position.fromArray(targetPosition);

resolve({
    get helper() {
        if (!helper) helper = new THREE.DirectionalLightHelper(mesh, 1);
        return helper;
    },
    get name() {
        return [
            `${__("Color")} ${page_object_params.vars.Color}`,
            `${__("Intensity")} ${page_object_params.vars.Intensity}`
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
