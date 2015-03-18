/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var _ = require('lodash');
var bunyan = require('bunyan');
var aws = require('aws-sdk');



module.exports = function(config, logger) {
  var _ec2 = new aws.EC2(config);
  var pollErrCount = 0;

  logger = logger || bunyan.createLogger({name: 'aws-ami-container'});



  /**
   * poll for completion of instance spin up/down
   */
  var pollInstanceStart = function(ec2, instance, cb) {
    var specific;
    logger.info('poll instance start: ' + instance.InstanceId);
    ec2.describeInstances({InstanceIds: [instance.InstanceId]}, function(err, data) {
      if (err) {
        if (pollErrCount > 5) {
          return cb(err);
        }
        else {
          pollErrCount++;
          setTimeout(function() { pollInstanceStart(ec2, instance, cb); }, 2000);
        }
      }
      var inst = data.Reservations[0].Instances[0];
      if (!(inst.State.Name === 'running' || inst.State.Name === 'terminated' || inst.State.Name === 'stopped')) {
        setTimeout(function() { pollInstanceStart(ec2, instance, cb); }, 2000);
      }
      else {
        specific = {imageId: inst.ImageId,
                    instanceId: inst.InstanceId,
                    publicIpAddress: inst.PublicIpAddress,
                    privateIpAddress: inst.PrivateIpAddress,
                    securityGroups: inst.SecurityGroups,
                    tags: inst.Tags};
        cb(null, specific);
      }
    });
  };



  /**
   * build the container
   * cdef - contianer definition block
   * out - ouput stream
   * cb - complete callback
   */
  var build = function build(mode, system, cdef, out, cb) {
    logger.info('building');
    out.stdout('building');
    cb();
  };



  /**
   * deploy the continaer
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var deploy = function deploy(mode, target, system, containerDef, container, out, cb) {
    logger.info('deploying');
    out.stdout('deploying');
    cb();
  };



  /**
   * undeploy the container from the target
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var undeploy = function undeploy(mode, target, system, containerDef, container, out, cb) {
    logger.info('undeploying');
    out.stdout('undeploying');
    cb();
  };


  
  /**
   * start the container on the target
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var start = function start(mode, target, system, containerDef, container, out, cb) {

    out.preview({cmd: 'start instances', host: null, user: null, keyPath: null});
    if (mode === 'preview') {
      return cb(null);
    }

    var params = {'MaxCount': 1,
                  'MinCount': 1,
                  'EbsOptimized': false,
                  'InstanceInitiatedShutdownBehavior': 'stop',
                  'InstanceType': 'm3.medium',
                  'KeyName': config.defaultKeyName,
                  'SubnetId': config.defaultSubnetId,
                  'Monitoring': { Enabled: false }};
                  /*'EbsOptimized': container.specific.ebsOptimized,
                  'InstanceInitiatedShutdownBehavior': container.specific.instanceInitiatedShutdownBehavior,
                  'InstanceType': container.specific.instanceType,
                  'KeyName': container.specific.keyName,
                  'Monitoring': container.specific.monitoring};*/

    params.ImageId = containerDef.specific.ImageId;
    if (system.topology.containers[container.containedBy].type === 'aws-sg') {
      params.SecurityGroupIds = [system.topology.containers[container.containedBy].nativeId];
    }

    _ec2.runInstances(params, function(err, data) {
      if (err) { return cb(err, null); }
      var instance = data.Instances[0];

      pollInstanceStart(_ec2, instance, function(err, newSpecific) {
        if (err) { return cb(err); }
        var tagParams = {Resources: [instance.InstanceId], Tags: container.specific.tags || []};
        tagParams.Tags.push({Key: 'nscale-system', Value: system.name + '-' + system.topology.name});
        tagParams.Tags.push({Key: 'nscale-id', Value: system.name + '-' + system.topology.name + '-' + container.id});
        if (containerDef.name) {
          tagParams.Tags.push({Key: 'Name', Value: container.id});
        }
        _ec2.createTags(tagParams, function() {
          if (err) { return cb(err); }
          var c = _.find(system.topology.containers, function(cont) { return cont.id === container.id; });
          c.nativeId = instance.InstanceId;
          c.specific = newSpecific;
          system.dirty = true;
          cb(null, system);
        });
      });
    });
  };



  /**
   * stop the container on the target
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var stop = function stop(mode, target, system, containerDef, container, out, cb) {
    logger.info('stopping');
    out.stdout('stopping');
    cb();
  };


  function findParentELB(target, container) {
    if (container.type === 'aws-elb') {
      return container;
    }

    if (container.containedBy === container.id) {
      // we did not find any ELB
      return null
    }

    return findParentELB(target, target.topology.containers[container.containedBy]);
  }

  function buildFuncElb(func, ifPresent) {
    return function (mode, target, elb, container, out, cb) {
      var _aws = new aws.ELB(config);

      if (mode === 'preview') {
        return cb(null);
      }

      _aws.describeLoadBalancers({LoadBalancerNames : [elb.id]}, function(err, data) {
        if (err) { return cb(err); }

        var linked = _.find(data.LoadBalancerDescriptions[0].Instances, function(instance) { return container.nativeId === instance.InstanceId; });
        var query;
        if (!ifPresent && !linked || ifPresent && linked) {
          query = {
            LoadBalancerName: elb.id,
            Instances: [{
              InstanceId: container.nativeId
            }]
          };

          logger.info({ query: query, func: func }, 'calling AWS');
          _aws[func](query, function(err) {
            cb(err, target);
          });
        }
        else {
          cb(null, target);
        }
      });
    }
  }

  var linkToELB = buildFuncElb('registerInstancesWithLoadBalancer', true);
  var unlinkFromELB = buildFuncElb('deregisterInstancesFromLoadBalancer', false);

  /**
   * link the container to the target
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var link = function link(mode, target, system, containerDef, container, out, cb) {
    logger.info('linking');
    out.stdout('linking');

    var elb = findParentELB(system, container);

    if (elb) {
      logger.info(elb, 'elb found');
      linkToELB(mode, system, elb, container, out, cb);
    } else {
      logger.info('elb not found');
      cb(null, system);
    }
  };



  /**
   * unlink the container from the target
   * target - target to deploy to
   * system - the target system defintinion
   * cdef - the contianer definition
   * container - the container as defined in the system topology
   * out - ouput stream
   * cb - complete callback
   */
  var unlink = function unlink(mode, target, system, containerDef, container, out, cb) {
    logger.info('unlinking');
    out.stdout('unlinking');

    var elb = findParentELB(system, container);

    if (elb) {
      logger.info(elb, 'elb found');
      unlinkFromELB(mode, system, elb, container, out, cb);
    } else {
      logger.info('elb not found');
      cb(null, target);
    }
  };



  return {
    build: build,
    deploy: deploy,
    start: start,
    stop: stop,
    link: link,
    unlink: unlink,
    undeploy: undeploy,
    add: deploy,
    remove: undeploy
  };
};
