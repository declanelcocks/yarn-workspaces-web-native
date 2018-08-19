# Frequently Asked Questions

___Q:___ __How do I add an API bundle?__

A fairly common requirement for a project that scales is to create additional servers bundles, e.g. an API server.

Your first thought is probably to play around with the Webpack config. However, all you have to do is provide the `source`, `entry` and `output` paths of the new bundle.

_Note:_ Make sure that within your new bundle, you export the created HTTP listener. This listener will be used by the development server to watch for file changes.

___Q:___ __Why are the dependencies structured like they are?__

The dependencies within `package.json` are structured so that the libraries required to transpile/bundle the source are contained within the `devDependencies` section, whilst the libraries required during the server runtime are contained within the `dependencies` section.

If you perform build tasks on your production environment you must ensure that you have allowed the installation of the `devDependencies` too (Heroku, for example doesn't do this by default).

There have been talks about creating a "dist" build, which would avoid target environment build steps however Webpack has an issue with bundle node_module dependencies if they include `require` statements using expressions/variables to resolve the module names.

___Q:___ __The project fails to build and execute when deployed__

It's likely that the hosting provider isn't installing the `devDependencies` (Heroku is known to do this). The dependencies in `package.json` are structured so that only libraries required during the server runtime are contained within the `dependencies` section.

Two solutions for this are:

 1. Prebuild the project and then deploy it with the `build` output. Make sure to remove any build folders from `.gitignore` for the deployment.
 2. Change your host config so that it will install the `devDependencies`. For Heroku, see [here](https://devcenter.heroku.com/articles/nodejs-support#devdependencies).
