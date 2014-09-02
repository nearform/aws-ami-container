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

var logger = require('bunyan').createLogger({name: 'blank-container'});
var aws = require('aws-sdk');



module.exports = function(config) {
  aws.config.update({region: config.region});
  var _ec2 = new aws.EC2();


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


  
//var params = {
//    Description: 'STRING_VALUE', /* required */
//      GroupName: 'STRING_VALUE', /* required */
//        DryRun: true || false,
//          VpcId: 'STRING_VALUE'
//};
//ec2.createSecurityGroup(params, function(err, data) {
//    if (err) console.log(err, err.stack); // an error occurred
//      else     console.log(data);           // successful response
//});

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
    cb();
    /*
     * container def has the ami-id (which will need to be edited)
     * boot an instance of the ami and replace parameters in the deployed section
     * will need to save a version - i.e. spun up machine so new immutable revision
     * - ami-id  - need to flag back that a commit should be made
     *
     * need to bring over security group definitions as part of this whole thing
     * for instances at least
     *
     * also need to collect tags 
     * tags and sgs 
     * create sgs if don't exist
     * boot up instances
     *
     */
    /*
    var newInstances = [];
    var params = {ImageId: containerDef.specific.amiid,
                  MinCount: 1,
                  MaxCount: 1,
                  KeyName: system.keyName,
                  SecurityGroupIds: containerDef.specific.securityGroupIds,
                  Monitoring: { Enabled: true },
                  InstanceType: containerDef.specific.instanceType};

    logger.info('starting');
    out.stdout('starting');

    if ('preview' === mode) {
      params.DryRun = true;
    }
    if (containerDef.specific.subnetId) {
      params.SubnetId = containerDef.specific.subnetId;
    }
    if (containerDef.specific.placement) {
      params.Placement = containerDef.specific.placement;
    }

    _ec2.runInstances(params, function(err, data) {
      if (err) { return cb(err, null); }
      _.each(data.Instances, function(instance) {
        var instanceId = instance.InstanceId;
        var params = {Resources: [instanceId], Tags: [{Key: 'Name', Value: 'test'}]};
        _ec2.createTags(params, function() {});
        newInstances.push({InstanceId: instance.InstanceId});
      });
      cb(err, newInstances);
    });
    cb();
    */
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

