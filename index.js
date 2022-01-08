// Copyright 2022 Anthony Mugendi
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const { rmSync } = require('fs');
const os = require('os'),
	path = require('path'),
	fs = require('fs-extra');

// The main class
class YieldArr {
	#arr;
	#arrIndex;
	#yield;
	#freezeDir;

	constructor(arr, opts = {}) {
		arr = arrify(arr);

		this.#arr = object_vals(arr);
		this.#freezeDir = path.join(os.tmpdir(), 'yield_arr');

		if ('backOffDelay' in opts) {
			opts.backOffDelay = arrify(opts.backOffDelay).filter(
				(v) => typeof v == 'number'
			);

			if (opts.backOffDelay.length < 1)
				throw new Error(
					`"opts.backOffDelay" must be an array of numbers`
				);
		}

		if ('maxDelay' in opts) {
			if (typeof opts.maxDelay !== 'number' || opts.maxDelay < 1)
				throw new Error(
					`"opts.backOffDelay" must be a number greater than 1`
				);
		}

		if ('filterFunc' in opts) {
			if (typeof opts.filterFunc !== 'function')
				throw new Error(`"opts.filterFunc" must be a function`);
		}

		// console.log({opts});
		this.opts = opts;
		this.consume = this.get;
		this.#arrIndex = 0;

		this.#yield = this.#yield_val();
	}

	*#yield_val() {
		this.#arrIndex = this.#arrIndex == undefined ? 0 : this.#arrIndex;

		while (true) {
			// pick value or undefined
			let val = this.#arr[this.#arrIndex] || null;
			// indicate we consumed
			if (val) val.consumed = true;
			// increment index
			if (this.#arrIndex <= this.#arr.length) {
				this.#arrIndex++;
			}

			// yield
			yield val;

			// unless we are already done
			if (this.yieldDone) return;
		}
	}

	#random_range(start = 0, end = 100) {
		if (!this.rangeArr) {
			let rangeArgs = [start, end];
			// ensure range
			if (rangeArgs.length == 0) rangeArgs = [0, 10];
			if (rangeArgs.length == 1) rangeArgs.push((range[0] + 1) * 5);

			this.rangeArr = range(...rangeArgs);
		}

		return sample(this.rangeArr);
	}

	#await_arr() {
		let self = this;
		return new Promise((resolve, reject) => {
			let ms = 50,
				delay = 0,
				maxDelay = this.opts.maxDelay || 0;

			if (maxDelay) {
				let interval = setInterval(() => {
					delay += ms;

					if (delay >= maxDelay) {
						clearInterval(interval);
						return resolve(false);
					}

					if (this.#arrIndex < this.#arr.length) {
						clearInterval(interval);
						return resolve(true);
					}
				}, ms);
			} else {
				resolve(false);
			}
		});
	}

	#prune_freeze_dir(returnLast = false) {
		if (!fs.existsSync(this.#freezeDir)) return;

		// get the last frozen from default freeze dir
		let files = fs
			.readdirSync(this.#freezeDir)
			.map((f) => path.join(this.#freezeDir, f));

		if (returnLast) {
			let lastFrozen = files.pop();
			// remove others
			files.map(fs.unlinkSync);
			return lastFrozen;
		} else {
			fs.emptyDirSync(this.#freezeDir);
			return null;
		}
	}

	async get(noValue = false) {
		let self = this;
		let val,
			backOffDelay = this.opts.backOffDelay
				? this.#random_range(...this.opts.backOffDelay)
				: null;

		// if we have a delay
		if (backOffDelay) await delay(backOffDelay);

		let v = this.#yield.next();

		if (v.done === false) {
			val = v.value;

			if (val == undefined) {
				// wait for update
				let resp = await this.#await_arr();

				if (!resp) {
					self.yieldDone = true;
					val = { value: undefined };
				} else {
					val = await this.get(true);
				}
			}
		} else {
			val = { value: undefined };
		}

		return noValue ? val : val.value;
	}

	arr() {
		return this.#arr;
	}

	update(arr) {
		// No updates if we are done
		if (this.yieldDone) return;
		// arrify
		arr = object_vals(arrify(arr));

		// Filter Unique
		if (this.opts.filterFunc) {
			arr = arrify(this.opts.filterFunc(this.#arr, arr));
		}

		this.#arr = [...this.#arr, ...arr];
	}

	stop() {
		this.yieldDone = true;
	}

	freeze(filePath) {
		validate_file_path(filePath);

		if (!filePath) {
			// make temp ppath
			filePath = path.join(
				this.#freezeDir,
				Date.now().toString() + '.json'
			);

			this.#prune_freeze_dir();
		}

		// ensure directory
		fs.ensureDirSync(path.dirname(filePath));

		fs.writeJSONSync(filePath, this.#arr, { spaces: 4 });

		this.stop();
	}

	load(filePath, append = false) {
		validate_file_path(filePath);

		if(!fs.existsSync(filePath)) returnr

		if (!filePath) {
			filePath = this.#prune_freeze_dir(true);
		}

		if (filePath) {
			// console.log(filePath);
			let loadedArr = fs.readJsonSync(filePath);
			// set #arrIndex to where we stopped consuming
			let i = 0;

			for (i in loadedArr) {
				if (loadedArr[i].consumed === false) break;
			}

			// start at next index
			i++;

			if (!append) {
				this.#arrIndex = i;
				this.#arr = loadedArr;
			} else {
				// console.log(this.#arr);
				this.#arr = this.#arr.concat(loadedArr.slice(i));
			}
		}
	}

	index() {
		return this.#arrIndex;
	}
}

function validate_file_path(filePath) {
	if (filePath) {
		if (typeof filePath !== 'string')
			throw new Error('File Path must be a string');
	}
}

function object_vals(arr) {
	return arr.map((value) => {
		return { consumed: false, value };
	});
}

function sample(arr) {
	let k = Math.floor(Math.random() * arr.length),
		v = arr[k];
	return v;
}

function range(s, e) {
	let arr = Array.from({ length: e + 1 }, (_, i) => i);
	arr = arr.map((v, k) => k).filter((v) => v >= s);
	return arr;
}

function arrify(v) {
	if (v === undefined) return [];
	return Array.isArray(v) ? v : [v];
}

function delay(ms) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

module.exports = YieldArr;
