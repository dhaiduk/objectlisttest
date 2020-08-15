const skyColor = parseInt(page_object_params.vars.Sky_Color),
    groundColor = parseInt(page_object_params.vars.Ground_Color),
    intensity = parseFloat(page_object_params.vars.Intensity),
    mesh = new THREE.HemisphereLight(skyColor, groundColor, intensity);

let helper;

mesh.size3 = new THREE.Vector3(1, 1, 1);

resolve({
    get helper() {
        if (!helper) helper = new THREE.HemisphereLightHelper(mesh, 1);
        return helper;
    },
    get name() {
        return [
            `${__("Sky Color")} ${page_object_params.vars.Sky_Color}`,
            `${__("Ground Color")} ${page_object_params.vars.Ground_Color}`,
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
