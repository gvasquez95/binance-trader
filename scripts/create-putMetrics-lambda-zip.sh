#!/bin/bash
npm ci --production
rm lambda.zip
zip -r lambda.zip src/* node_modules
npm install
