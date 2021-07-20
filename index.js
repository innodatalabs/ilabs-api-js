const fetch = require('node-fetch');


function sleep(millis) {
    return new Promise( resolve => setTimeout( resolve, millis ) );
}

/**
 * CLinet to access InnodataLabs prediction microservices.
 */
class Client {

    constructor({userKey, endpoint='https://ilabs-api.innodata.com/v1', userAgent='@innodatalabs/ilabs-api'}) {
        this.endpoint = endpoint;
        this._authHeaders = {
            'User-Key': userKey,
            'User-Agent': userAgent,
            'Cache-control': 'no-cache',
        }
    }

    async _fetch(url, options) {
        const { method='GET', headers={}, body } = options || {};
        // console.log(url, method, headers, body)
        const response = await fetch(url, {
            method,
            headers: {
                ...this._authHeaders,
                ...headers,
            },
            body,
        });
        if (response.status !== 200 && response.status !== 201 && response.status !== 202) {
            throw new Error(`fetch failed with status ${response.status}`);
        }

        return response;
    }

    /**
     * Checks is endpoint is accessible. Does not require userKey.
     * @returns { ping: "pong" }
     */
    async ping() {
        const response = await fetch(`${this.endpoint}/ping`);
        const result = await response.json();
        return result;
    }

    /**
     * Upload content to the document store.
     *
     * Content need to be in the document store in order to use prediction services on it.
     *
     * @param {*} content - content to send. Could be a string, a FileStream open for reading, or Buffer
     *
     * @returns remote file name
     */
    async upload(content) {
        const response = await this._fetch(`${this.endpoint}/documents/input`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
            },
            body: content,
        });
        const result = await response.json();

        return result.input_filename;
    }

    /**
     * Downloads the preocessed file from remote document store.
     *
     * @param {String} name - remote file name
     * @returns Buffer object with the content.
     */
    async download(name) {
        const response = await this._fetch(`${this.endpoint}/documents/output/${name}`);
        const body = await response.buffer();

        return body;
    }

    /**
     * Kicks off the prediction job.
     *
     * @param {String} domain - prediction domain
     * @param {String} name - remote file name
     * @param {Object} params - (optional) query parameters for the microservice
     * @returns {String} - task id.
     */
    async predict(domain, name, params) {
        let url = `${this.endpoint}/reference/${domain}/${name}`;
        if (params) {
            url = url + '?' + new URLSearchParams(params);
        }
        const response = await this._fetch(url);
        const result = await response.json();

        return result.task_id;
    }

    /**
     * Retrieves the status of a task.
     *
     * @param {String} domain - prediction domain
     * @param {String} task_id - task id
     * @returns {Object} - status object. Watch for status.completed and status.error.
     */
    async status(domain, task_id) {
        const response = await this._fetch(`${this.endpoint}/reference/${domain}/${task_id}/status`);
        const result = await response.json();
        return result;
    }

    /**
     * Cancels a task
     * @param {String} domain - prediction domain
     * @param {String} task_id - task id
     */
    async cancel(domain, task_id) {
        await this._fetch(`${this.endpoint}/reference/${domain}/${task_id}/cancel`);
    }

    /**
     * Blocks asynchronously until task is completed.
     *
     * @param {String} domain - prediction domain
     * @param {String} task_id - task id
     */
    async waitForCompletion(domain, task_id) {
        let result = {};
        try {
            let delay = 1000;  // 1sec
            for (let i = 0; i < 100; i++) {
                await sleep(delay);
                delay = delay > 30000 ? 60000 : delay * 2;  // truncated exp backoff
                result = await this.status(domain, task_id);
                if (result.completed) {
                    if (result.error) {
                        throw new Error(result.error);
                    }
                    return;
                };
            }
            throw new Error('timeout')
        } finally {
            if (!result.completed) {
                await this.cancel(domain, task_id);
            }
        }
    }

    /**
     * Runs prediction.
     *
     * @param {String} domain - prediction domain
     * @param {String} content - content to process
     * @param {Object} params - (optional) prediction parameters
     *
     * @returns processed content
     */
    async call(domain, content, params) {

        const name = await this.upload(content);

        const task_id = await this.predict(domain, name, params);

        await this.waitForCompletion(domain, task_id);

        const predicted = await this.download(name);

        return predicted;
    }
}


module.exports = Client;
module.exports.sleep = sleep;
