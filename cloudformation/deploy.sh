#!/bin/bash
script=dynamodb-binance-prices.yaml
aws cloudformation validate-template --template-body file://$script
aws cloudformation deploy --template-file $script --stack-name binance-table