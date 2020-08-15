new Helper.ModelLoader()
    .load(page_object_params.vars.url)
    .catch(reject)
    .then(o =>
        resolve(
            Object.assign(
                {
                    get name() {
                        return Helper.UrlToObjectName(
                            page_object_params.vars.url
                        );
                    },
                    mesh: undefined,
                    animations: [],
                    animate() {},
                    destroy() {}
                },
                o
            )
        )
    );
