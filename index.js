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
		this.arr = arrify(arr);

		opts = Object.assign(
			// {
			// 	backOffDelay: [100, 300],
			// 	maxDelay: 3000,
			// },
			opts
		);

		// Some validations
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
				this.arrIndex++;
			}

			yield val;
			if (this.yieldDone) return;
			// else
		}
	}

	async get() {
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
				// console.log('object');
				await this.await_arr()
					.then((resp) => {
						if (!resp) {
							self.yieldDone = true;
						}
					})
					.catch(console.error);
			}
		}

		return val;
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
			let ms = 10,
				delay = 0,
				maxDelay = this.opts.maxDelay || 0;

			if (maxDelay) {
				let interval = setInterval(() => {
					delay += ms;

					if (delay >= maxDelay) {
						// console.log({ delay });
						clearInterval(interval);
						return resolve(false);
					}

					if (self.arr.length) {
						clearInterval(interval);
						return resolve(true);
					}
				}, ms);
			} else {
				// console.log('end now');
				resolve(false);
			}
		});
	}

	update(arr) {
		// arrify
		arr = arrify(arr);
		this.arr = [...this.arr, ...arr];
	}
}

function sample(arr) {
	let k = Math.floor(Math.random() * arr.length),
		v = arr[k];
	return v;
}

function range(s, e) {
	let arr = Array.from(new Array(e + 1));
	arr = arr.map((v, k) => k).filter((v) => v >= s);
	return arr;
}

function arrify(v) {
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
