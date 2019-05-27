'use strict';

const BbPromise = require('bluebird');
const _ = require('lodash');

module.exports = {
  compileListenerRules() {
    this.validated.events.forEach((event) => {
      const listenerRuleLogicalId = this.provider.naming
        .getAlbListenerRuleLogicalId(event.functionName, event.priority);
      const targetGroupLogicalId = this.provider.naming
        .getAlbTargetGroupLogicalId(event.functionName);

      const Conditions = [
        {
          Field: 'path-pattern',
          Values: [event.conditions.path],
        },
        {
          Field: 'host-header',
          Values: [event.conditions.host],
        },
      ];

      _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
        [listenerRuleLogicalId]: {
          Type: 'AWS::ElasticLoadBalancingV2::ListenerRule',
          Properties: {
            Actions: [
              {
                Type: 'forward',
                TargetGroupArn: {
                  Ref: targetGroupLogicalId,
                },
              },
            ],
            Conditions,
            ListenerArn: event.listenerArn,
            Priority: event.priority,
          },
        },
      });
    });

    return BbPromise.resolve();
  },
};
