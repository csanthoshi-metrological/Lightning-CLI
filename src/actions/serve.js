/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2020 Metrological
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const execa = require('execa')
const path = require('path')
const chalk = require('chalk')
const os = require('os')
const { exec, execSync } = require('child_process')
const isLocallyInstalled = require('../helpers/localinstallationcheck')
const buildHelpers = require('../helpers/build')
const sequence = require('../helpers/sequence')

module.exports = () => {
  return sequence([
    () => buildHelpers.ensureLightningApp(),
    () => {
      const args = [
        process.env.LNG_BUILD_FOLDER ? `./${process.env.LNG_BUILD_FOLDER}` : './build',
        process.env.LNG_SERVE_OPEN === 'false' ? false : '-o',
        process.env.LNG_SERVE_CACHE_TIME ? '-c' + process.env.LNG_SERVE_CACHE_TIME : '-c-1',
        process.env.LNG_SERVE_PORT ? '-p' + process.env.LNG_SERVE_PORT : false,
        process.env.LNG_SERVE_PROXY ? '-P' + process.env.LNG_SERVE_PROXY : false,
        process.env.LNG_SERVE_CORS ? '--cors=' + (process.env.LNG_SERVE_CORS === 'true' ? '*' : process.env.LNG_SERVE_CORS) : false,
      ].filter(val => val)

      const levelsDown = isLocallyInstalled()
        ? buildHelpers.findFile(process.cwd(), 'node_modules/.bin/http-server')
        : path.join(__dirname, '../..', 'node_modules/.bin/http-server')

      const subprocess = execa(levelsDown, args)

      subprocess.catch(e => console.log(chalk.red(e.stderr)))
      subprocess.stdout.pipe(process.stdout)

      // Hack for windows to prevent leaving orphan processes, resulting in multiple http-server running instances
      if (os.platform() === 'win32') {
        process.on('SIGINT', () => {
          const task = 'taskkill /pid ' + subprocess.pid + ' /t /f'
          if (process.env.LNG_LIVE_RELOAD) {
            execSync(task)
          } else {
            exec(task, () => {
              process.exit()
            })
          }
        })
      }

      return subprocess
    },
  ])
}
