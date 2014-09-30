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

/*
 * spins up a test image... 
 */
var bunyan = require('bunyan');
var logger = bunyan.createLogger({name: 'aws-ami-container'});
var mode = 'live';
var target = null;
var system = {name: 'wibble', topology: { containers: {}}};
var containerDef = {id: '1234'};
var container = { id: '3456', specific: {securityGroups: [{'GroupName': 'nfd', 'GroupId': 'sg-5bdc573e'}], tags: [{'Key': 'Name', 'Value': 'demo'}]}};
var out = {preview: function() {}};
var config = {defaultImageId: 'ami-cf0741ff',
              defaultSubnetId: 'subnet-838e7ef4',
              defaultKeyName: 'nscale-west2',
              region: 'us-west-2',
              accessKeyId: 'AKIAIM7DJXQ4VJBPWEUQ',
              secretAccessKey: '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'};
var c = require('../../lib/container')(config, logger);

c.start(mode, target, system, containerDef, container, out, function(err) {
  console.log(err);
});


