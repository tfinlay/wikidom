'use strict';

const parseUrlParams = () => {
    if (!location.hash) {
        return new Map();
    }

    try {
        const parameters = location.hash
            .slice(1)  // Remove '#' prefix
            .split(/&/)  // Split into parameter key=value pairs
        ;

        const paramMap = new Map();
        for (const param of parameters) {
            const [key, value] = param.split(/=/, 2);
            paramMap.set(decodeURIComponent(key), decodeURIComponent(value));
        }

        return paramMap;
    }
    catch (e) {
        console.error(e);
        alert("Failed to parse hash parameters... Please verify that they are formatted correctly.");
        return new Map();
    }
};

const searchForWikiArticle = async (query) => {
    // Thanks to https://stackoverflow.com/a/27458013
    const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&redirects=resolve&origin=*`,
        {
            referrerPolicy: 'no-referrer'
        }
    );

    if (!res.ok) {
        return null;
    }

    const body = await res.json();
    console.log("Successfully searched for wiki article", body);

    const splitArticleUrl = body[3][0].split(/\//);
    return splitArticleUrl[splitArticleUrl.length - 1];
};

const findRedirectUrlForWikiArticle = async (articleId) => {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(articleId)}&prop=text&formatversion=2&format=json&origin=*`, {
        referrerPolicy: 'no-referrer'
    });

    if (!res.ok) {
        return null;
    }

    // Inspired by https://github.com/aaronjanse/dns-over-wikipedia/blob/master/browser-extension/common.js
    const body = (await res.json()).parse.text;
    const doc = new DOMParser().parseFromString(body, "text/html");
    let url = null;
    doc.body.querySelectorAll('table.infobox > tbody > tr').forEach(row => {
        if (/(Website)|(URL)/i.test(row.firstChild.textContent)) {
            row.id = "__TARGET_ROW";
            const linkEl = doc.body.querySelector("#__TARGET_ROW .infobox-data a");
            const href = linkEl?.getAttribute("href");
            if (href) {
                url = href;
            }
        }
    })
    return url;
};

(async () => {
    const params = parseUrlParams();
    console.log("Starting with parameters", params);

    if (params.has('q')) {
        // We have a query!
        // DNS redirect time.
        const articleUrl = await searchForWikiArticle(params.get('q'));
        if (articleUrl !== null) {
            const redirectUrl = await findRedirectUrlForWikiArticle(articleUrl);
            console.log("Found redirect URL", redirectUrl);
            if (redirectUrl) {
                window.open(redirectUrl, '_self');
            }
        }
    }
})();
