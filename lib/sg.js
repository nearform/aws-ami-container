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
var _ec2;


var handleGroup = function(index, system, container, cb) {
  if (container.specific.securityGroups.length > index) {
    var sg = container.specific.securityGroups[index];
    var group = _.find(system.containerDefintions, function(cdef) { return cdef.id === sg.GroupId; });
    var sgParams = { GroupIds: [group.id] };
    _ec2.describeSecurityGroups(sgParams, function(err, sgroups) {
      if (!(!err && sgroups && sgroups.SecurityGroups.length > 0)) {
        _ec2.createSecurityGroup({Description: group.specific.Description,
                                 GroupName: group.specific.GroupName}, function(err, data) {
          if (err) { return cb(err); }
          if (group.specific.IpPermissions) {
            _ec2.authorizeSecurityGroupIngress({GroupId: data.GroupId,
                                               GroupName: group.specific.GroupName,
                                               IpPermissions: group.specific.IpPermissions}, function(err, data) {
              if (err) { return cb(err); }
              if (group.specific.IpPermissionEgress) {
                _ec2.authorizeSecurityGroupEgress({GroupId: data.GroupId,
                                                   GroupName: group.specific.GroupName,
                                                   IpPermissions: group.specific.IpPermissionsEgress}, function(err) {
                  cb(err);
                });
              }
              else {
                cb();
              }
            });
          }
          else {
            cb();
          }
        });
      }
      else {
        handleGroup(index + 1, system, container, cb);
      }
    });
  }
  else {
    cb();
  }
};



exports.handleSecurityGroups = function(ec2, system, container, cb) {
  _ec2 = ec2;
  handleGroup(0, container, function(err) {
    cb(err);
  });
};

