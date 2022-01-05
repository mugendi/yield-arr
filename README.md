# What?
When you need to yield array values in a **"disciplined manner"** ;)

```javascript

(async () => {
	//lets use https://www.npmjs.com/package/debug to log
	//remember to set process.env.DEBUG
	const debug = require('debug')('yieldArr:test');

	//require
	const YieldArr = require('yield-arr');

	const opts = {
		backOffDelay: [1000, 2000],
		maxDelay: 2000,
	};

	// initialize with options passing the initial array too
	const Y = new YieldArr(gen_array(), opts);

	// have another process (like a crawl job?) update the array
	const int = setTimeout(() => {
		debug('After 5 seconds. Adding 4 items');
		Y.update(gen_array());
	}, 5000);

	// Loot/wait till there are no more array items to yield/get
	while (true) {
		let v = await Y.get();
		// no more items? break loop
		if (v == undefined) break;
		debug(v, Y.arr().length);
	}

	debug('done');

    // inpect the array
    debug(Y.arr().slice(-3));

	// function used to generate arrays in this example
	function gen_array() {
		return Array.from({ length: 5 }, (a, i) => i);
	}


})();
```

This will output something like:

```text
  yieldArr:test 0 5 +0ms
  yieldArr:test 1 5 +2s
  yieldArr:test 2 5 +2s
  yieldArr:test After 5 seconds. Adding 4 items +371ms
  yieldArr:test 3 10 +2s
  yieldArr:test 4 10 +2s
  yieldArr:test 0 10 +1s
  yieldArr:test 1 10 +2s
  yieldArr:test 2 10 +1s
  yieldArr:test 3 10 +1s
  yieldArr:test 4 10 +1s
  yieldArr:test done +2s
  yieldArr:test [
  yieldArr:test   { consumed: true, value: 2 },
  yieldArr:test   { consumed: true, value: 3 },
  yieldArr:test   { consumed: true, value: 4 }
  yieldArr:test ] +1ms
```

Note:

-   The array length `Y.arr.length` doubled after we updated the array with new items after 5 seconds.

-   So long as the array is updated, then it keeps yielding via `Y.get()`.

-   At the end of the of the array, we waited another 2 seconds before "giving up" and ending. This is because `maxDelay` was set to **2000** within the options.

-   There was a delay of 1-2 seconds between each call. This is because we set the option ``backOffDelay` to **[1000, 2000]**. This means that the system took a random duration between 1000 ms and 2000 ms between each yield.

-   All updated items are added to the end of the array


# API
### ```new YieldArr(Array [,Options])```
Initializes Yield Arr. 
 
\* First argument can be a value or array. Not undefined!

### ```.get()```
Get yielded array value.

### ```.update(Array)```
Update array items. Works by concatenating new items at the end of the array (FIFO).

\* First argument can be a value or array. 

### ```.arr()```
You may want to look at the array being consumed. You can do so by inspecting ```Y.arr``` as shown i example above.

**Note:**
- Array items are saved as objects such as : ```{ consumed: true, value: 2 }```. This means that whenever you inspect the array, you can see all items that have been consumed and those pending.

### ```.stop()```
Stops all yielding immediately and next ```.get()``` call will get an ```undefined``` value.

### ```.freeze([filePath])```
Stops and saves the array status in the file provided. 

**Note**: 
- The directory path to the file provided must exist.
- Where no ```filePath``` is provided, then one is created in a temporary directory in your ```os.tempdir()``` path.

### ```.load([filePath, append])```
Loads *frozen* file and sets index at the element that was not consumed before the file was frozen.

**Note**: 
- Where no ```filePath``` is provided, then the last frozen file, if any, is loaded from the temporary directory created by ```freeze()``` above.
- If ```append=true``` then the loaded array is appended to the end of any other array that might have been assigned at initialization time or with ```update()```.


# Who or what is this for?

This module was written as part of a crawler. It works as follows.

1. At the beginning, we seed the array with url we want to crawl.
2. We then scrape that page and update our array with all links we find in page.
3. We then "get" (consume) the growing array link by link while using a decent "backOffDelay" not to overwhelm severs.
4. At the end, when there are no more links to add, and we have waited for about 3 seconds (maxDelay), we know there are no more links and we are done with site crawl.

Let's see what you get to use it for!
