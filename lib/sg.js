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
var fs = require('fs');
var executor = require('nscale-util').executor();
var _ec2;
var _config;
var _mode;

var GROUP_NAME = '__GROUP_NAME__';
var PROTOCOL = '__PROTOCOL__';
var PORT = '__PORT__';
var CIDR = '__CIDR__';


/**
 * the aws function ec2.authorizeSecurityGroupIngress appears to just not work...
 * this temporary hack creates a set of AWS command line instructions in a single 
 * bash script and executes them to set ingress rules on a given security group
 */
var hackIngress = function(groupName, ipPermissions, out, cb) {
  var ingress = 'aws ec2 authorize-security-group-ingress --group-name __GROUP_NAME__ --protocol __PROTOCOL__ --port __PORT__ --cidr __CIDR__\n';
  var script = '';
  var rule = '';

  script = 'export AWS_ACCESS_KEY_ID=' + _config.accessKeyId + '\n';
  script += 'export AWS_SECRET_ACCESS_KEY=' + _config.secretAccessKey + '\n';
  script += 'export AWS_DEFAULT_REGION=' + _config.region + '\n';
  _.each(ipPermissions, function(perm) {
    rule = ingress.replace(GROUP_NAME, groupName);
    rule = rule.replace(PROTOCOL, perm.IpProtocol);
    rule = rule.replace(PORT, perm.FromPort);
    rule = rule.replace(CIDR, perm.IpRanges[0].CidrIp);
    script += rule;
  });

  fs.writeFileSync('/tmp/_hackingress.sh', script, 'utf8');
  executor.exec(_mode, 'sh /tmp/_hackingress.sh', '/tmp', out, cb);
};



var handleGroup = function(index, system, container, out, cb) {
  if (container.specific.securityGroups.length > index) {
    var sg = container.specific.securityGroups[index];
    var group = _.find(system.containerDefinitions, function(cdef) { return cdef.id === sg.GroupId; });
    var sgParams = { GroupNames: [group.name] };
    _ec2.describeSecurityGroups(sgParams, function(err, sgroups) {
      if (!(!err && sgroups && sgroups.SecurityGroups.length > 0)) {
        _ec2.createSecurityGroup({Description: group.specific.Description, GroupName: group.specific.GroupName}, function(err) {
          if (err) { return cb(err); }
          if (group.specific.IpPermissions) {
            setTimeout(function() {
              hackIngress(group.specific.GroupName, group.specific.IpPermissions, out, function() {
                handleGroup(index + 1, system, container, out, cb);
              });
            }, 10000);
          }
          else {
            handleGroup(index + 1, system, container, out, cb);
          }
        });
      }
      else {
        handleGroup(index + 1, system, container, out, cb);
      }
    });
  }
  else {
    cb();
  }
};



exports.handleSecurityGroups = function(mode, config, ec2, system, container, out, cb) {
  _ec2 = ec2;
  _config = config;
  _mode = mode;

  handleGroup(0, system, container, out, function(err) {
    cb(err);
  });
};


/*
            setTimeout(function() {
              var sgParams = { GroupIds: [data.GroupId]};
                //_ec2.authorizeSecurityGroupIngress({GroupId: data.GroupId, IpPermissions: group.specific.IpPermissions}, function(err) {
              sgHackIngress(group.specific.GroupName, group.specific.IpPermissions, function() {
  //                if (err) { return cb(err); }
  //                if (group.specific.IpPermissionEgress) {
  //                  _ec2.authorizeSecurityGroupEgress({GroupId: data.GroupId, IpPermissions: group.specific.IpPermissionsEgress}, function(err) {
  //                    cb(err);
  //
*/
