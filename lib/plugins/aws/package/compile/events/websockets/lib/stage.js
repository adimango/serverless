'use strict';

/* eslint-disable no-use-before-define */

const _ = require('lodash');
const BbPromise = require('bluebird');

module.exports = {
  compileStage() {
    const service = this.serverless.service.service;
    const stage = this.options.stage;
    const provider = this.serverless.service.provider;
    const cfTemplate = provider.compiledCloudFormationTemplate;

    // logs
    const logs = provider.logs && provider.logs.websocket;

    const stageLogicalId = this.provider.naming
      .getWebsocketsStageLogicalId();
    const logGroupLogicalId = this.provider.naming
      .getWebsocketsLogGroupLogicalId();
    const logsRoleLogicalId = this.provider.naming
      .getWebsocketsLogsRoleLogicalId();
    const accountLogicalid = this.provider.naming
      .getWebsocketsAccountLogicalId();

    const stageResource = {
      Type: 'AWS::ApiGatewayV2::Stage',
      Properties: {
        ApiId: {
          Ref: this.websocketsApiLogicalId,
        },
        DeploymentId: {
          Ref: this.websocketsDeploymentLogicalId,
        },
        StageName: this.provider.getStage(),
        Description: this.serverless.service.provider
          .websocketsDescription || 'Serverless Websockets',
      },
    };

    // create log-specific resources
    if (logs) {
      _.merge(stageResource.Properties, {
        AccessLogSettings: {
          DestinationArn: {
            'Fn::GetAtt': [
              logGroupLogicalId,
              'Arn',
            ],
          },
          Format: [
            '$context.identity.sourceIp',
            '$context.identity.caller',
            '$context.identity.user',
            '[$context.requestTime]',
            '"$context.eventType $context.routeKey $context.connectionId"',
            '$context.status',
            '$context.requestId',
          ].join(' '),
        },
        DefaultRouteSettings: {
          DataTraceEnabled: true,
          LoggingLevel: 'INFO',
        },
      });

      _.merge(cfTemplate.Resources, {
        [logGroupLogicalId]: getLogGroupResource(service, stage),
        [logsRoleLogicalId]: getIamRoleResource(service, stage),
        [accountLogicalid]: getAccountResource(logsRoleLogicalId),
      });
    }

    _.merge(cfTemplate.Resources, { [stageLogicalId]: stageResource });

    return BbPromise.resolve();
  },
};

function getLogGroupResource(service, stage) {
  return ({
    Type: 'AWS::Logs::LogGroup',
    Properties: {
      LogGroupName: `/aws/websocket/${service}-${stage}`,
    },
  });
}

function getIamRoleResource(service, stage) {
  return ({
    Type: 'AWS::IAM::Role',
    Properties: {
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: [
                'apigateway.amazonaws.com',
              ],
            },
            Action: [
              'sts:AssumeRole',
            ],
          },
        ],
      },
      ManagedPolicyArns: [
        'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
      ],
      Path: '/',
      RoleName: {
        'Fn::Join': [
          '-',
          [
            service,
            stage,
            {
              Ref: 'AWS::Region',
            },
            'apiGatewayLogsRole',
          ],
        ],
      },
    },
  });
}

function getAccountResource(logsRoleLogicalId) {
  return ({
    Type: 'AWS::ApiGateway::Account',
    Properties: {
      CloudWatchRoleArn: {
        'Fn::GetAtt': [
          logsRoleLogicalId,
          'Arn',
        ],
      },
    },
  });
}
