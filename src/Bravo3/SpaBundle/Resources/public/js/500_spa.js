/**
 * Single-page application engine
 */
var Spa = (function($)
{
    /**
     * Meta-reference for closures
     *
     * @type {Spa}
     */
    var self = this;

    /**
     * Check if we have history support
     *
     * @type {boolean}
     */
    var enabled = !!(window.history && window.history.pushState);

    /**
     * Local absolute URL prefixes
     *
     * @type {Array}
     */
    var base_refs = [
        window.location.protocol + '//' + window.location.host,
        '//' + window.location.host
    ];

    var preload_callbacks = [];

    var postload_callbacks = [];

    var cachedload_callbacks = [];

    var error_callbacks = [];

    /**
     * Page state cache
     *
     * @type {PageState}
     */
    var page_state = new PageState($);

    /**
     * Debug mode
     *
     * @type {boolean}
     */
    var debug = false;

    var log = function(msg)
    {
        if (debug) {
            console.log("SPA: " + msg);
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
        page_state.setDebug(debug);
    };

    /**
     * Test if a given link is an internal link
     *
     * @param {string} href
     * @returns {boolean}
     */
    var isInternalLink = function(href)
    {
        if (!href || href == '#') {
            return false;
        }

        // Test for absolute internal references
        for (var i = 0; i < base_refs.length; i++) {
            var base = base_refs[i];
            if (href.slice(0, base.length) == base) {
                return true;
            }
        }

        // Any other protocol is an external link, missing protocol is internal
        return href.search(/^\w+:/) === -1;
    };

    /**
     * Fade out mandatory blocks for a visual queue when navigating away
     *
     * @param {int} speed
     * @param {function} done
     */
    var fadeOutBlocks = function(speed, done)
    {
        $('.spa_block_mandatory').fadeTo(speed ? speed : 200, 0.3, done);
    };

    /**
     * Fade all blocks back in
     *
     * @param {int} speed
     * @param {function} done
     */
    var fadeInBlocks = function(speed, done)
    {
        $('.spa_block_mandatory').stop().fadeTo(speed ? speed : 200, 1, done);
    };

    /**
     * Navigate to a page by loading from cache
     *
     * This function will hook links, but will not call History.pushState()
     *
     * @param {string} url
     */
    var loadCached = function(url)
    {
        log("Load cached: " + url);

        fadeOutBlocks(150, function()
        {
            page_state.loadPage(url);
            self.hookLinks();

            $.each(cachedload_callbacks, function(key, closure)
            {
                closure();
            });

            fadeInBlocks(150);
        });
    };

    /**
     * Navigate to a page via an XHR request
     *
     * This function will hook links and call pushState().
     7*
     * @param {string} url
     * @param {string} cache_key
     * @param {function} done
     */
    var navigateXhr = function(url, cache_key, done)
    {
        log("Navigate XHR: " + url);

        // Clear the cache for this page so we don't trigger a double-load from window.statechange
        if (page_state.pageExists(url)) {
            page_state.purgeCache(url);
        }

        // Preload callbacks
        $.each(preload_callbacks, function(key, closure)
        {
            closure();
        });

        // Make the request
        $.ajax({
            url: url,
            headers: {'x-spa-request': '1'},
            cache: false
        }).done(function(data)
        {
            History.pushState({}, '', cache_key ? cache_key : url);
            page_state.setPageState(data.title, data.blocks, 0);
            self.hookLinks();

            // Post-load callbacks
            $.each(postload_callbacks, function(key, closure)
            {
                closure();
            });

            // Completed callback
            if (done !== undefined) {
                done();
            }

            // If you press back, there is no trigger to save the current page before the history is changed
            // Save it now so we have some kind of copy
            page_state.saveCurrentPage();
        }).fail(function(e)
        {
            $.each(error_callbacks, function(key, closure)
            {
                closure(e, url);
            });
        }).always(function()
        {
            fadeInBlocks();
        });
    };

    /**
     * Traditional navigation
     *
     * @param {string} url
     */
    var navigateTraditional = function(url)
    {
        window.location = url;
    };

    /**
     * Initialise the SPA engine
     */
    this.init = function()
    {
        log("Init");
        this.hookLinks();

        // This is called after History.pushState(), so be careful when navigating not to trigger a second page load
        // from the cache. The page state should be saved _after_ this event fires, so a typical XHR naviation should
        // perform normally, and this function will not do anything.
        History.Adapter.bind(window, 'statechange', function()
        {
            var url = history.location || document.location;
            if (page_state.pageExists(url)) {
                loadCached(url);
            }
        });

        return this;
    };

    /**
     * Search jQuery descriptor for links to hook
     *
     * @param {string} q
     */
    this.hookQuery = function(q)
    {
        $(q).each(function()
        {
            var anchor = this;
            if (anchor.spa_hooked !== undefined || $(anchor).hasClass('no-spa')) {
                return;
            } else {
                anchor.spa_hooked = 1;
            }

            $(anchor).click(function()
            {
                var href = $(this).attr("href");
                if (isInternalLink(href)) {
                    self.navigate(href);
                    return false;
                }
            });
        });
        return this;
    };

    /**
     * Hook all internal links so that they go through the XHR request platform
     */
    this.hookLinks = function()
    {
        return this.hookQuery('a:link');
    };

    /**
     * Navigate to a new internal URL using an XHR/SPA request
     *
     * @param {string} url
     */
    this.navigate = function(url)
    {
        log("Navigate: " + url);

        if (!enabled) {
            navigateTraditional(url);
            return this;
        }

        page_state.saveCurrentPage();

        if (page_state.pageExists(url)) {
            // This will change the URL then trigger window.stagechange, which will load from cache
            History.pushState({}, '', url);
        } else {
            fadeOutBlocks();
            navigateXhr(url);
        }

        return this;
    };

    /**
     * Disregarding the current page cache, force an XHR request to a new page but store its result as another key
     *
     * This function can be used for cache busting with auxillery information. Beware that it will not save the current
     * page before navigating away.
     *
     * @param {string} real_url
     * @param {string} cache_url
     * @param {function} done
     */
    this.navigateAs = function(real_url, cache_url, done)
    {
        if (!enabled) {
            navigateTraditional(real_url);
            return this;
        }

        log("Navigate as (" + cache_url + "): " + real_url);
        fadeOutBlocks();
        navigateXhr(real_url, cache_url, done);
        return this;
    };

    /**
     * Preload or reload a cached page
     *
     * @param {string} url
     */
    this.backgroundLoadPage = function(url)
    {
        if (!enabled) {
            return this;
        }

        log("Preload: " + url);
        $.ajax({
            url: url,
            headers: {'x-spa-request': '1'}
        }).done(function(data)
        {
            page_state.savePageState(url, data.title, data.blocks);
        }).fail(function(e)
        {
            $.each(error_callbacks, function(key, closure)
            {
                closure(e);
            });
        }).always(function()
        {
            fadeInBlocks();
        });

        return this;
    };

    /**
     * Reload the current page
     *
     * @param {bool} maintain_scroll_pos Set to true to move the scroll pos back where it was before navigating
     */
    this.reloadCurrentPage = function(maintain_scroll_pos)
    {
        if (!enabled) {
            window.location.reload();
        }

        var scroll_pos = $('body').scrollTop();

        var done = function()
        {
            if (maintain_scroll_pos === true) {
                $(window).scrollTop(scroll_pos);
            }
        };

        fadeOutBlocks();
        navigateXhr(window.location.href, null, done);
    };

    /**
     * Remove a page from the cache
     *
     * @param {string} url
     */
    this.purgeCache = function(url)
    {
        page_state.purgeCache(url);
        return this;
    };

    /**
     * Purge all cache
     */
    this.purgeCacheAll = function()
    {
        page_state.purgeCacheAll();
        return this;
    };

    /**
     * Purge all pages starting with url_head
     *
     * @param {string} url_head
     */
    this.purgeCacheHead = function(url_head)
    {
        page_state.purgeCacheHead(url_head);
        return this;
    };

    this.onPreload = function(closure)
    {
        preload_callbacks.push(closure);
        return this;
    };

    this.onPostload = function(closure)
    {
        postload_callbacks.push(closure);
        return this;
    };

    this.onCachedLoad = function(closure)
    {
        cachedload_callbacks.push(closure);
        return this;
    };

    this.onPageError = function(closure)
    {
        error_callbacks.push(closure);
        return this;
    };

    $(function()
    {
        self.init();
    });

    return this;
})(jQuery);
