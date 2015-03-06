/**
 * Page state caching
 *
 * @constructor
 */
function PageState($)
{
    /**
     * Cached page data
     *
     * @type {Array}
     */
    var page_cache = [];

    /**
     * Debug mode
     *
     * @type {boolean}
     */
    var debug = false;

    var log = function(msg)
    {
        if (debug) {
            console.log("PG_STATE: " + msg);
        }
    };

    /**
     * Enable or disable debug mode
     *
     * @param {boolean} state
     */
    this.setDebug = function(state)
    {
        debug = !!state;
    };

    /**
     * Saves the current page in the page cache
     */
    this.saveCurrentPage = function()
    {
        var data = {
            title: document.title,
            blocks: {},
            scroll_pos: $('body').scrollTop()
        };

        $('.spa_block').each(function()
        {
            var id = $(this).attr('id');
            if (id.slice(0, 10) != "spa_block_") {
                return;
            } else {
                id = id.substr(10);
            }

            data.blocks[id] = $(this).html();
        });

        log("Save current page [" + window.location.href + "]: " + document.title);
        page_cache[window.location.href] = data;
    };

    /**
     * Check if a page is cached
     *
     * @param {string} url
     * @return {bool}
     */
    this.pageExists = function(url)
    {
        return page_cache[url] !== undefined;
    };

    /**
     * Load a page from the page cache
     *
     * @param {string} url
     * @return {bool}
     */
    this.loadPage = function(url)
    {
        log("Load page: " + url);
        if (!this.pageExists(url)) {
            console.error("Attempted to load uncached page: " + url);
            return false;
        }

        var data = page_cache[url];

        this.setPageState(data.title, data.blocks, data.scroll_pos);
        return true;
    };

    /**
     * Load data into the current page
     *
     * @param {string} title Page title
     * @param {string} blocks Associative array of block data
     * @param {int} scroll_pos
     */
    this.setPageState = function(title, blocks, scroll_pos)
    {
        log("Set page state: " + title);
        document.title = $("<div/>").html(title).text();
        $.each(blocks, function(block_name, block_html)
        {
            $('#spa_block_' + block_name).html(block_html);
        });
        $('body').scrollTop(scroll_pos);
    };

    /**
     * Set the data for a cached page
     *
     * @param {string} url URL of the page
     * @param {string} title Page title
     * @param {string} blocks Associative array of block data
     */
    this.savePageState = function(url, title, blocks)
    {
        log("Save page [" + url + "]: " + title);
        if (page_cache[url] === undefined) {
            page_cache[url] = {
                title: title,
                blocks: blocks,
                scroll_pos: 0
            };
        } else {
            page_cache[url] = {
                title: title,
                blocks: blocks,
                scroll_pos: page_cache[url].scroll_pos
            };
        }
    };

    /**
     * Clear all page cache
     */
    this.purgeCacheAll = function()
    {
        log("Purging cache");
        for (var key in page_cache) {
            if (page_cache.hasOwnProperty(key)) {
                page_cache[key] = undefined;
            }
        }

        page_cache = [];
    };

    /**
     * Remove a page from the cache
     *
     * @param {string} url
     */
    this.purgeCache = function(url)
    {
        log("Purging: " + url);
        page_cache[url] = undefined;
    };

    /**
     * Purge all pages starting with url_head
     *
     * @param {string} url_head
     */
    this.purgeCacheHead = function(url_head)
    {
        for (var key in page_cache) {
            if (page_cache.hasOwnProperty(key)) {
                if (key.substr(0, url_head.length) == url_head) {
                    log("Purging: " + key);
                    page_cache[key] = undefined;
                }
            }
        }
    };
}
