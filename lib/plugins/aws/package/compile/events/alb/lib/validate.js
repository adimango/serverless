'use strict';

const _ = require('lodash');

module.exports = {
  validate() {
    const events = [];

    _.forEach(this.serverless.service.functions, (functionObject, functionName) => {
      _.forEach(functionObject.events, (event) => {
        if (_.has(event, 'alb')) {
          if (_.isObject(event.alb)) {
            const albObj = {
              listenerArn: event.alb.listenerArn,
              priority: event.alb.priority,
              conditions: {
                host: event.alb.conditions.host,
                path: event.alb.conditions.path,
              },
              // the following is data which is not defined on the event-level
              functionName,
            };
            events.push(albObj);
          }
        }
      });
    });

    return {
      events,
    };
  },
};
