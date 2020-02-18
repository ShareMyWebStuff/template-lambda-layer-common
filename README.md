# template-lambda-layer-common

**Note: please see the template-aws-infrastructure before using this**

## Introduction

A lambda layer is where code common to lambda functions is placed. Each function can have upto 5 layers. Layers help to reduce the size of the lambda functions by placing code in the layers, this will also reduce the cold start time of the functions. The lowest layer will probably have code common to all functions (in this project database access), then at the next level I will have a layer that is specific only to tutors or a smaller subset of the project. In tutor lambda functions they will contain both layers in other functions they will only contain the lowest level (database).

This layer contains the following
bcryptjs
jsonwebtoken
mysql
validator
services/db

In order to deploy this layer you will need to build it and deploy it. 

**Before doing this you will need to change the layer name to one you want in the package.json file.**

## Build

To build this layer run the below command. This will create a zip file for deployment.

npm run build

## Deploy

To deploy this layer requires the zip file. The zip file will be deployed to AWS. This can be run via the npm command

npm run deploy  

The npm command runs an AWS CLI command.

aws lambda publish-layer-version --layer-name "<layer-name>" --description "..." --license-info "MIT" --zip-file fileb://..\lambda-layer.zip --compatible-runtimes nodejs10.x

## Lambda Function Layer Usage

In order to use code in a layer in a lambda function is the same.

require('bcryptjs');

In order to use your own code such as the db.js file we require as follows (if using node).

require('/opt/nodejs/<file>');
