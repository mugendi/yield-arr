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

class YieldArr {
	constructor(arr, opts) {
		arr = arrify(arr);
		// Some validations
		if (arr.length === 0)
			throw new Error(
				`An array or value must be passed as the first argument.`
			);

		this.arr = object_vals(arr);

		// No Default options
		// opts = Object.assign(
		// 	// {
		// 	// 	backOffDelay: [100, 300],
		// 	// 	maxDelay: 3000,
		// 	// },
		// 	opts
		// );

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

		this.opts = opts;
		this.yield = this.yield_val();
	}

	*yield_val() {
		this.arrIndex = this.arrIndex == undefined ? 0 : this.arrIndex;

		while (true) {
			let val;

			if (this.arrIndex < this.arr.length) {
				val = this.arr[this.arrIndex];
				val.consumed = true;
				this.arrIndex++;
			}

			yield val;

			if (this.yieldDone) {
				return;
			}
			// else
		}
	}

	async get(noValue=false) {
		let self = this;
		let val,
			backOffDelay = this.opts.backOffDelay
				? this.random_range(...this.opts.backOffDelay)
				: null;

		// if we have a delay
		if (backOffDelay) await delay(backOffDelay);

		let v = this.yield.next();

		if (v.done === false) {
			val = v.value;

			if (val == undefined) {
				// wait for update
				let resp = await this.await_arr();

				if (!resp) {
					self.yieldDone = true;
                    val = {value:undefined}
				} else {
					val = await this.get(true);
				}
			}
		}

        

		return noValue ? val : val.value;
	}

	random_range(start = 0, end = 100) {
		if (!this.rangeArr) {
			let rangeArgs = [start, end];
			// ensure range
			if (rangeArgs.length == 0) rangeArgs = [0, 10];
			if (rangeArgs.length == 1) rangeArgs.push((range[0] + 1) * 5);

			this.rangeArr = range(...rangeArgs);
		}

		return sample(this.rangeArr);
	}

	await_arr() {
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

					if (this.arrIndex < this.arr.length) {
						clearInterval(interval);
						return resolve(true);
					}
				}, ms);
			} else {
				resolve(false);
			}
		});
	}

	update(arr) {
		// No updates if we are done
		if (this.yieldDone) return;
		// arrify
		arr = object_vals(arrify(arr));
		this.arr = [...this.arr, ...arr];
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
