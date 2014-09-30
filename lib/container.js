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
var sg = require('./sg');
var sd = require('nscale-util').sysdef();



module.exports = function(config, logger) {
  aws.config.update(config);
  aws.config.update({region: config.region});
  var _ec2 = new aws.EC2();

  logger = logger || bunyan.createLogger({name: 'aws-ami-container'});

  /**
   * poll for completion of instance spin up/down
   */
  var pollInstanceStart = function(ec2, instance, cb) {
    var specific;
    ec2.describeInstances({InstanceIds: [instance.InstanceId]}, function(err, data) {
      if (err) { return cb(err); }
      var inst = data.Reservations[0].Instances[0];
      if (!(inst.State.Name === 'running' || inst.State.Name === 'terminated' || inst.State.Name === 'stopped')) {
        setTimeout(function() { pollInstanceStart(ec2, instance, cb); }, 1000);
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

    out.preview({cmd: 'check security groups', host: null, user: null, keyPath: null});
    if (mode !== 'preview') {
      sg.handleSecurityGroups(mode, config, _ec2, system, container, out, function(err, newSystem) {
        cb(err, newSystem);
      });
    }
    else {
      cb();
    }
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

    _ec2.describeImages({ImageIds: containerDef.id}, function(err, data) {
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

      if (!err && data.Images.length > 0) {
        params.ImageId = containerDef.id;
      }
      else {
        params.ImageId = config.defaultImageId;
      }
      
      var sgIds = [];
      _.each(container.specific.securityGroups, function(sg) {
        sgIds.push(sg.GroupId);
      });
      params.SecurityGroupIds = sgIds;

      _ec2.runInstances(params, function(err, data) {
        if (err) { return cb(err, null); }
        var instance = data.Instances[0];

        var tagParams = {Resources: [instance.InstanceId], Tags: container.specific.tags};
        tagParams.Tags.push({Key: 'nscale-system', Value: system.name});
        _ec2.createTags(tagParams, function() {
          pollInstanceStart(_ec2, instance, function(err, newSpecific) {
            if (err) { return cb(err); }
            var replace = [{oldId: container.id, newId: instance.InstanceId}, {oldId: containerDef.id, newId: params.ImageId}];
            system = sd.replaceId(container.id, instance.InstanceId, system);
            system = sd.replaceId(containerDef.id, params.ImageId, system);
            system.topology.containers[instance.InstanceId].specific = newSpecific;
            system.dirty = true;
            cb(null, system, replace);
          });
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
    cb();
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
    cb();
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

