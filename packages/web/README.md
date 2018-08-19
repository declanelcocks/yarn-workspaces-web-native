# Package Scripts

## `npm run analyze:client`

Runs `webpack-bundle-analyze` against a production build of the client bundle.

## `npm run analyze:server`

Runs `webpack-bundle-analyze` against a production build of the server bundle.

## `npm run build`

Builds optimized client and server bundles in `production` mode.

## `npm run build:dev`

Builds client and server bundles in `development` mode.

## `npm run clean`

Deletes any content from the build output folders.

## `npm run deploy`

Deploys the application using [`now`](https://zeit.co/now). Requires zero configuration to allow the app to be deployed. Make sure to run `npm i -g now` to install `now` before running this command.

## `npm run develop`

Starts a development server for the client and server bundles. To keep our bundles up-to-date, `react-hot-loader` is launched to handle hot reloading of the client bundle, and an `fs` watcher is launched to reload the server.

## `npm run lint`

Runs `eslint` against the project.

## `npm run start`

Starts the server by itself. This will expect that you've already build the bundles using `npm run build` as the server is using ES6.

## `npm run test`

Does a single run through of all of our tests with `jest`.

## `npm run test:watch`

Runs `jest` in `watch` mode to watch for any changes to your tests.

## `npm run test:coverage`

Runs `jest` tests and generates a coverage report. Something like [codecov.io](https://codecov.io) can be used to host any coverage reports and display in the `README`.

## `npm run storybook`
Runs `start-storybook` and Storybook will be available on http://localhost:6006.

## `npm run storybook:build`
Runs `build-storybook` and outputs to `./.style-guide`.

## `npm run storybook:sync`
Runs `aws s3 sync` and syncs `./.style-guide` with the `altitudelabs-template-react-storybook` bucket.

## npm run storybook:deploy
Runs the two storybook commands above to deploy the latest style guide to S3 in one command.

# Deployment - `web-server`

There are a variety of places the `web-server` can be deployed to. As we work on more projects, this section will be updated to add guidelines on how to deploy to each service.

## now

Deploying to [now](https://zeit.co/now) can be done in a single command by running `now` in the terminal. It can be configured to add things like custom domains, SSL certificates etc. also through the command line.

## AWS Elastic Beanstalk

First, run `aws configure` in your terminal to ensure you are using the correct AWS profile. If it's a new project, you can create a new set of keys on AWS for the project. If it's an existing project, it's best to ask the project owner on how to get setup.

After this, you can run `eb init --interactive`, making sure that you run it from within the `web-server` folder. Go ahead and choose your region, then you should be presented with a familiar list of app names to choose from. If it's a brand new project, you can make a new one from here. The same applies to the next step where you'll be prompted to choose a keypair to associate with this deployment, create a new keypair if no one has done this yet.

That's it! Run `eb status` and you should see the current status of your existing/new app. From here on, you can run `eb deploy` to deploy a new version to Elastic Beanstalk. Any environment variables can be set through the Elastic Beanstalk dashboard, which for the `web-server` should be more than sufficient.
