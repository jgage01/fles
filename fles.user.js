// ==UserScript==
// @name        FetLife Enhancement Suite
// @description Provide customization of the FetLife user interface
// @license     GPL-3.0-or-later
// @homepageURL https://github.com/unnaturaldevelopment/fles
// @supportURL  https://github.com/unnaturaldevelopment/fles/issues
// @version     1.5.0
// @updateURL   https://openuserjs.org/meta/unnaturaldeveloper/FetLife_Enhancement_Suite.meta.js
// @namespace   unnaturaldevelopment
// @match       https://fetlife.com/*
// @resource    normalize4ab3de5 https://cdn.rawgit.com/necolas/normalize.css/4ab3de5bdd26b161c3c82a5a2f72df3e57a8e4bf/normalize.css#md5=fda27b856c2e3cada6e0f6bfeccc2067,sha1=734a72e6c28d4a3a870404fb4abf72723c754296,sha512=faa0766a27f822e530f9cd2d1f9c3b8989abeefe8027e14b52aaf6c1faf732cf633fa2062926613b487807db84a418754ee3ede81a3c1cb593940157d6f71c65
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// ==/UserScript==
// ==OpenUserJS==
// @author unnaturaldeveloper
// ==/OpenUserJS==

'use strict';

function adjustGroup() {
    // Replace 'ago' with actual timestamp
    if( GM_getValue('timestamp_groups') ) {
        const timestampList = document.getElementsByClassName('refresh-timestamp');
        let listLength = timestampList.length;
        for( let i = 0; i < listLength; i++ ) {
            timestampList[i].textContent = 'on ' + timestampList[i].title;
        }
    }
    // Replace group href with redirect to new discussions instead of comments
    if( GM_getValue('group_new_discussion') ) {
        const groupListingList = document.getElementsByClassName('group_listing');
        let listLength = groupListingList.length;
        for( let i = 0; i < listLength; i++ ) {
            groupListingList[i].href = groupListingList[i] + '?order=discussions';
        }
    }
    // Add link to latest comment in group
    if( GM_getValue('group_link_to_last_comment') ) {
        const discussionsFollowingList = document.querySelectorAll('ul.discussions_following li');
        discussionsFollowingList.forEach(function (discussion) {
            let discussionElement = discussion.firstElementChild;
            let discussionLink = 'https://fetlife.com' + discussionElement.getAttribute('href');
            GM_xmlhttpRequest({
                method: 'GET',
                url: discussionLink,
                onload: function handleResponse(response) {
                    const discussionDOM = new DOMParser().parseFromString(response.responseText, 'text/html');
                    let pagination = discussionDOM.querySelector('div.pagination');
                    let pageRef = discussionLink;
                    if (pagination !== null) {
                        let pages = pagination.querySelectorAll('a:not([class])');
                        pageRef = 'https://fetlife.com' + (pages[pages.length - 1].getAttribute('href'));
                    }
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: pageRef,
                        onload: function handleResponse(response) {
                            const pageDOM = new DOMParser().parseFromString(response.responseText, 'text/html');
                            let comments = pageDOM.querySelectorAll('section#comments article');
                            if( comments.length !== 0 ) {
                                let last_comment_id = comments[comments.length - 1].getAttribute('id');
                                if( pagination !== null) {
                                    pageRef = pageRef.replace(/#\w*/gm, '#' + last_comment_id + '_anchor');
                                }
                                else {
                                    pageRef = pageRef + '#' + last_comment_id + '_anchor';
                                }
                                discussionElement.setAttribute('href', pageRef);
                            }
                        }
                    });
                }
            });
        });
    }
}
function adjustSubGroup() {
    // Replace 'ago' with actual timestamp
    if( GM_getValue('timestamp_group') ) {
        const timestampList = document.getElementsByClassName('refresh-timestamp');
        let listLength = timestampList.length;
        for( let i = 0; i < listLength; i++ ) {
            if( timestampList[i].parentElement.parentElement.className !== 'sticky_line' ) {
                timestampList[i].textContent = 'updated on ' + timestampList[i].title;
            }
        }
    }
}
function adjustGroupPost() {
    // Enable multi-reply
    if( GM_getValue('multi-reply-in-subgroup') ) {
        const commentList = document.querySelectorAll('section#comments article div.fl-flag__body footer.fl-comment__actions span span.fl-text-separator--dot a[data-comment-author-nickname]');
        commentList.forEach(function(comment){
            let multiReplyElement = comment.parentElement.cloneNode(true);
            multiReplyElement.firstElementChild.innerHTML = 'Multi-Reply';
            multiReplyElement.firstElementChild.removeAttribute('href');
            multiReplyElement.firstElementChild.removeAttribute('data-comment-reply');
            multiReplyElement.firstElementChild.classList.add('fles-link');
            multiReplyElement.addEventListener('click', multyReplyInsert);
            comment.parentElement.insertAdjacentElement('beforeEnd',multiReplyElement);
        });
    }

    // Enable viewing of image inline
    if( GM_getValue('inline-image-in-subgroup') ) {
        const sidebarDiv = document.querySelector('a#report_discussion_button').parentElement;
        const toggleInlineButtonOP = '<br><br><a id="fles-group-enable-inline-image-op" class="fles-link xq xs tdn">View images in original post</a>';
        sidebarDiv.insertAdjacentHTML('beforeEnd',toggleInlineButtonOP);
        sidebarDiv.querySelector('a#fles-group-enable-inline-image-op').addEventListener('click',function(){ toggleInlineImage('op'); });
        const toggleInlineButtonThread = '<br><br><a id="fles-group-enable-inline-image-thread" class="fles-link xq xs tdn">View images in thread</a>';
        sidebarDiv.insertAdjacentHTML('beforeEnd',toggleInlineButtonThread);
        sidebarDiv.querySelector('a#fles-group-enable-inline-image-thread').addEventListener('click',function(){ toggleInlineImage('thread'); });

    }

    // Add reply to original poster in group discussion
    if( GM_getValue('reply-to-op-in-subgroup') ) {
        const originalPostMeta = document.querySelector('div.group_post div.may_contain_youtubes p.quiet.small');
        originalPostMeta.insertAdjacentHTML('beforeEnd','<span class="fl-text-separator--dot">&nbsp;<a class="quiet fles-link">Reply</a></span>');
        $('div.group_post div.may_contain_youtubes p.quiet.small span a.fles-link').click(multyReplyInsert);
    }

    // Add ability to quote via copy/paste
    if( GM_getValue('quote-in-group') ) {
        const postBody = document.querySelector('div.group_post div.may_contain_youtubes');
        postBody.addEventListener('copy', function () {
            GM_setValue('text-to-quote', window.getSelection().toString());
        });
        const comments = document.querySelectorAll('div.fl-comment__text');
        comments.forEach(function (comment) {
            comment.addEventListener('copy', function () {
                GM_setValue('text-to-quote', window.getSelection().toString());
            });
        });
    }
}
function multyReplyInsert(Event) {
    let pName = '';
    if(Event.target.text === 'Reply')
    {
        pName = Event.target.parentElement.parentElement.firstElementChild.innerHTML;
    }
    else if(Event.target.text === 'Multi-Reply')
    {
        pName = Event.target.getAttribute('data-comment-author-nickname');
    }
    else if(Event.target.text === 'Mention') {
        pName = Event.target.ownerDocument.querySelector('figcaption span cite a').innerHTML;
    }

    let commentBox = $('form fieldset p textarea');
    commentBox.focus();

    let existingComment = commentBox.val();
    if( Event.target.text === 'Mention' ) existingComment = '';

    let textToQuote = GM_getValue('text-to-quote');

    if(typeof textToQuote == 'undefined' || textToQuote === '')
    {
        commentBox.val(existingComment + '@' + pName + ' ');
    }
    else {
        textToQuote = textToQuote.replace(/^(\S.*)/gm,'> $1');
        commentBox.val(existingComment + textToQuote + ' -');
        commentBox.val(commentBox.val() + ' @' + pName + '\n');
        GM_setValue('text-to-quote','');
    }
}
function toggleInlineImage(position) {
    const pictureRE = RegExp('^https://fetlife.com/users/[0-9]*/pictures/[0-9]*$');
    let imageList = '';

    switch(position) {
        case 'op' : {
            imageList = document.querySelectorAll('div.may_contain_youtubes a');
            break;
        }
        case 'thread' : {
            imageList = document.querySelectorAll('div#group_post_comments_container section#comments a');
            break;
        }
    }

    imageList.forEach(function(image){
        let imageLink = image.getAttribute('href');
        if( pictureRE.test(imageLink))
        {
            GM_xmlhttpRequest({
                method: 'GET',
                url: imageLink,
                onload: function handleResponse(response) {
                    if( response.finalUrl === imageLink ) {
                        const imageDOM = new DOMParser().parseFromString(response.responseText, 'text/html');
                        let imgSrc = imageDOM.querySelector('figure.fl-picture a img[src]');
                        image.removeAttribute('title');
                        image.text = '';
                        imgSrc.classList.remove('fl-disable-interaction');
                        image.insertAdjacentElement('afterBegin', imgSrc);
                    }
                }
            });
        }
    });
}
function adjustPosts() {
    // Collapse user posts
    if( GM_getValue('collapse_user_posts') ) {
        let articleArray = [];
        const writingElement = document.querySelector('section#profile_header div.member-info p span.small:last-child');
        const postCount = writingElement.querySelector('span').innerHTML.replace(/[()]/g, '');
        let pages = Math.ceil(postCount / 10);
        // Single Page
        let articles = document.querySelectorAll('section.span-19 article');
        let footer = document.querySelector('section.span-19 footer');
        articles.forEach(function (article) {
            articleArray.push(article);
            // Remove them from visible page
            article.parentNode.removeChild(article);
        });
        footer.parentNode.removeChild(footer);
        if (pages > 1) {
            for (let i = 2; i <= pages; i++) {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: window.location.href + '?page=' + i,
                    onload: function (response) {
                        const postPage = new DOMParser().parseFromString(response.responseText, 'text/html');
                        let articles = postPage.querySelectorAll('section.span-19 article');
                        articles.forEach(function (article) {
                            articleArray.push(article);
                        });
                        if (articleArray.length == postCount) {
                            modifyPostsPage(articleArray);
                        }
                    }
                });
            }

        }
        else {
            if (articleArray.length == postCount) {
                modifyPostsPage(articleArray);
            }
        }
    }
}
function modifyPostsPage(articles) {
    let sortedArticles = sortPostsByTimestamp(articles);
    let modifiedPage = document.querySelector('section.span-19');
    sortedArticles.forEach(function(article) {
        let articleBody = article.querySelector('div.may_contain_youtubes');
        articleBody.parentNode.removeChild(articleBody);
        let articleAvatar = article.querySelector('header a.fl');
        articleAvatar.parentNode.removeChild(articleAvatar);
        let articleTitle = article.querySelector('h2');
        articleTitle.setAttribute('style', 'font-size: 85%;');
        modifiedPage.insertAdjacentElement('beforeEnd',article);
    });
}
function sortPostsByTimestamp(articles) {
    if(articles.length < 2) {
        return articles;
    }
    let pivot = articles[0];
    let lesser = [];
    let greater = [];
    for(var i = 1; i < articles.length; i++) {
        if(new Date(articles[i].querySelector('time').getAttribute('datetime')) < new Date(pivot.querySelector('time').getAttribute('datetime')))
        {
            lesser.push(articles[i]);
        } else {
            greater.push(articles[i]);
        }
    }
    return sortPostsByTimestamp(greater).concat(pivot, sortPostsByTimestamp(lesser));
}
function adjustPicture() {
    // Enable reply to image owner
    if( GM_getValue('reply_to_image_owner') ) {
        const leaveCommentElement = document.querySelector('section#comments header h1');
        leaveCommentElement.insertAdjacentHTML('beforeEnd','<span class="fl-text-separator--dot">&nbsp;<a class="quiet fles-link">Mention</a></span>');
        $('section#comments header h1 span a.fles-link').click(multyReplyInsert);
    }
}
function adjustProfile() {
    // Enable redirection of click on avatar to full image in gallery
    if( GM_getValue('redirect_avatar_to_gallery')) {
        const imgLink = document.querySelector('img.pan').src.split(/^https:\/\/pic[0-9].fetlife.com\/[0-9]+\/[0-9]+\/([\w-]+)_[0-9]+.jpg/)[1];
        GM_xmlhttpRequest({
            method: 'GET',
            url: window.location.href + '/pictures',
            onload: function handleResponse(response) {
                const profileGallery = new DOMParser().parseFromString(response.responseText, 'text/html');
                const galleryPages = profileGallery.getElementById('pictures').getAttribute('data-total-pages');
                for (let j = 1; j <= galleryPages; j++) {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: window.location.href + '/pictures?p=false&page=' + j,
                        onload: function findImage(response) {
                            const imageList = new DOMParser().parseFromString(response.responseText, 'text/html');
                            const galleryImages = imageList.querySelector('#pictures').querySelectorAll('ul')[0].children;
                            for (let i = 0; i < galleryImages.length; i++) {
                                if (galleryImages[i].firstElementChild.firstElementChild.src.split(/^https:\/\/pic[0-9].fetlife.com\/[0-9]+\/[0-9]+\/([\w-]+)_[0-9]+.jpg/)[1] === imgLink) {
                                    document.querySelector('img.pan').parentElement.href = galleryImages[i].firstElementChild.href;
                                }
                            }
                        }
                    });
                }
            }
        });
    }

    // Enable links to friends/followers/following from profile page
    if( GM_getValue('clickable_friend_categories')) {
        const friendCats = document.querySelectorAll('div#profile ul.friends');
        friendCats.forEach(function(category){
            let elementText = category.previousElementSibling.textContent;
            let newRef = window.location.href;
            if( elementText.match('^Friends')) {
                newRef = newRef + '/friends';
            }
            else if( elementText.match('^Followers')) {
                newRef = newRef + '/followers';
            }
            else if( elementText.match('^Following')) {
                newRef = newRef + '/following';
            }
            else if( elementText.match('^Mutual Friends')) {
                newRef = newRef + '/friends/mutual';
            }
            category.previousElementSibling.outerHTML = '<a href="' + newRef + '">' + category.previousElementSibling.outerHTML + '</a>';
        });
    }

    // Identify common kinks, and highlight
    if( GM_getValue('common_kink_highlight')) {
        let myFetId = unsafeWindow.FL.user.id;
        let currentProfileId = window.location.href.split(/users\/([0-9]+)/)[1];
        let kinkList = {};
        if( GM_getValue('common_kink_highlight-color') )
        {
            GM_addStyle('span.fles-kink { color:' + GM_getValue('common_kink_highlight-color') + ';}');
        }
        let DOMsection = document.querySelectorAll('div.content_container div#profile div.container div.border div h3.bottom');
        DOMsection.forEach(function (header) {
            if (header.innerText.match(/^Fetishes/)) {
                let iteratorHack = header.nextElementSibling;
                while (iteratorHack) {
                    if (iteratorHack.outerHTML == '<br>') {
                        break;
                    }
                    else {
                        let listCategoryElement = iteratorHack.querySelector('p span > em');
                        let listCategory = listCategoryElement.innerText.slice(0, -1);
                        let listItemElements = listCategoryElement.parentElement.parentElement.querySelectorAll('a');
                        if (myFetId == currentProfileId) {
                            let myKinks = [];
                            listItemElements.forEach(function (itemElement) {
                                myKinks.push(itemElement.innerText);
                            });
                            kinkList[listCategory] = myKinks;
                        }
                        else {
                            let myKinks = JSON.parse(GM_getValue('myKinkList'));
                            listItemElements.forEach(function (itemElement) {
                                if (myKinks[listCategory].includes(itemElement.innerText)) {
                                    itemElement.innerHTML = '<span class="fles-kink">' + itemElement.innerHTML + '</span>';
                                }
                            });
                            if (listCategory.match(/limit/)) {
                                let limits = listCategoryElement.parentElement.parentElement.innerText.split(/:([\w\W]+)/)[1].split(',');
                                limits.forEach(function (limit) {
                                    if (listCategory in myKinks && myKinks[listCategory].includes(limit.trim())) {
                                        listCategoryElement.parentElement.parentElement.innerHTML =
                                            listCategoryElement.parentElement.parentElement.innerHTML.replace(limit.trim(), '<span class="fles-kink">' + limit.trim() + '</span>');
                                    }
                                });
                            }
                        }
                    }
                    iteratorHack = iteratorHack.nextElementSibling;
                }
                if (myFetId == currentProfileId) {
                    GM_setValue('myKinkList', JSON.stringify(kinkList));
                }
            }
        });
    }

    // Mutual followers should be friends
    if( GM_getValue('show_mutual_followers')) {
        let myFetId = unsafeWindow.FL.user.id;
        let currentProfileId = window.location.href.split(/users\/([0-9]+)/)[1];
        let cacheTime = GM_getValue('mutual_follower_cache_time', false);
        if (myFetId == currentProfileId) {
            if (cacheTime == false || cacheTime >= (cacheTime + 3600000)) {
                GM_setValue('mutual_follower_cache_time', Date.now().toLocaleString());
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: window.location.href + '/followers',
                    onload: function (response) {
                        cacheList(response);
                    }
                });
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: window.location.href + '/following',
                    onload: function (response) {
                        cacheList(response);
                    }
                });
            }
            let followers = GM_getValue('followers');
            let following = GM_getValue('following');
            if (followers && following) {
                const lastElement = document.querySelector('div.span-5 p.more');
                lastElement.insertAdjacentHTML('beforeBegin', '<br><h4>Mutual Followers</h4><ul id="fles-mutual-followers" class="friends clearfix"></ul>');
                const mutualFollowerElement = document.querySelector('ul#fles-mutual-followers');
                followers = JSON.parse(followers);
                following = JSON.parse(following);

                Object.keys(followers).forEach(function (key) {
                    if (key in following) {
                        mutualFollowerElement.insertAdjacentHTML('afterBegin',
                            '<a href="https://fetlife.com/' + key + '">' +
                            '<li>' +
                            '<img ' +
                            'alt="' + key + '" ' +
                            'title="' + key + '" ' +
                            'width="32" height="32" class="avatar profile_avatar" src="' + following[key] + '"></li>');
                    }
                });
            }
        }
    }
}
function cacheList(response)
{
    const baseUrl = response.finalUrl;
    const pageDOM = new DOMParser().parseFromString(response.responseText, 'text/html');
    let nextPageElement = pageDOM.querySelector('div#maincontent div.container div.mtl a.next_page');
    let totalCountElement = pageDOM.querySelector('div.fl-nav__main ul.dib li.in_section a');
    let totalCount = totalCountElement.innerText.split(/(?:\w* \()(\d+)(?:\))/)[1];
    let totalPages = 1;
    let list = {
        memberList: {},
        listCount: 0,
        addMember: function(key, value) {
            this.memberList[key] = value;
            this.listCount += 1;
        },
        saveList: function(key) {
            GM_setValue(key.split('/')[5],JSON.stringify(this.memberList));
        },
        isComplete: function(total) {
            if( total == this.listCount ){
                return true;
            }
            else {
                return false;
            }
        }
    };

    if( nextPageElement !== null ) {
        totalPages = nextPageElement.previousElementSibling.innerHTML;
    }

    while( totalPages >= 1 )
    {
        let loopUrl = baseUrl + '?page=' + totalPages;
        GM_xmlhttpRequest({
            method: 'GET',
            url: loopUrl,
            onload: function (response) {
                if (response.status == 200) {
                    const pageDOM = new DOMParser().parseFromString(response.responseText, 'text/html');
                    let memberImages = pageDOM.querySelectorAll('div.fl-member-card img.fl-avatar__img');
                    memberImages.forEach(function (memberImage) {
                        let memberName = memberImage.getAttribute('title');
                        let imageSrc = memberImage.src;
                        list.addMember(memberName,imageSrc);
                        if( list.isComplete(totalCount) === true ){
                            list.saveList(baseUrl);
                        }
                    });
                }
            }
        });
        totalPages -= 1;
    }
}
function adjustNewConv() {
    // Enable automatic message box cursor placement for new messages
    if( GM_getValue('pm_message_box_cursor_new')) {
        const messageBox = document.querySelector('form#new_conversation input#subject');
        messageBox.focus();
    }
}
function adjustExistingConv() {
    // Enable automatic message box cursor placement for active conversations
    if( GM_getValue('pm_message_box_cursor_active')) {
        const messageBox = document.querySelector('div.message_body div.input-group textarea[name=body]');
        messageBox.focus();
    }
}
function adjustInbox() {
    // Listen for turbolinks:click to conversation#new-message
    const convRE = RegExp('https://fetlife.com/conversations/[0-9]*.*$');
    document.addEventListener('turbolinks:load',function(){
        if(convRE.test(window.location.href)) {
            adjustExistingConv();
        }
        addFlesSettings();
    });
}
function adjustSettingsResp() {
    document.addEventListener('turbolinks:load',function() {
        addFlesSettings();
    });
}

function addFlesSettings(){
    // asterisk icon courtesy of https://fontawesome.com
    // Usage license: https://fontawesome.com/license
    const asteriskIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
        '<path d="M478.21 334.093L336 256l142.21-78.093c11.795-6.477 15.961-21.384 ' +
        '9.232-33.037l-19.48-33.741c-6.728-11.653-21.72-15.499-33.227-8.523L296 186.718l3.475-162.204C299.763 11.061 ' +
        '288.937 0 275.48 0h-38.96c-13.456 0-24.283 11.061-23.994 24.514L216 186.718 77.265 ' +
        '102.607c-11.506-6.976-26.499-3.13-33.227 8.523l-19.48 33.741c-6.728 11.653-2.562 26.56 9.233 33.037L176 256 ' +
        '33.79 334.093c-11.795 6.477-15.961 21.384-9.232 33.037l19.48 33.741c6.728 11.653 21.721 15.499 33.227 ' +
        '8.523L216 325.282l-3.475 162.204C212.237 500.939 223.064 512 236.52 512h38.961c13.456 0 24.283-11.061 ' +
        '23.995-24.514L296 325.282l138.735 84.111c11.506 6.976 26.499 3.13 33.227-8.523l19.48-33.741c6.728-11.653 ' +
        '2.563-26.559-9.232-33.036z"/></svg>';

    let notifyBar = document.querySelector('body nav div.self-end ul.list li a[href="/search"]');
    if( notifyBar !== null )
    {
        // /inbox and /conversations/.* are using a new responsive design for the navbar... compensating
        notifyBar = notifyBar.parentElement;
        const flesNavElement = notifyBar.cloneNode(false);
        const flesNavAnchor = notifyBar.firstElementChild.cloneNode(false);
        flesNavAnchor.id = 'fles-settings';
        flesNavAnchor.removeAttribute('href');
        flesNavAnchor.insertAdjacentHTML('afterBegin',asteriskIcon);
        flesNavElement.insertAdjacentElement('afterBegin',flesNavAnchor);
        notifyBar.insertAdjacentElement('beforeBegin',flesNavElement);
        notifyBar = notifyBar.parentElement; // Necessary hack to find the FLES icon
    }
    else {
        notifyBar = document.querySelector('div.fl-nav__right-hand-wrapper div.fl-nav__notifications-wrapper');
        notifyBar.insertAdjacentHTML('beforeEnd', '<a id="fles-settings" class="fl-nav__notification fl-nav__icon ' +
            'knockout-bound" title="FLES Settings">' + asteriskIcon + '</a>');
    }
    GM_addStyle(
        'a#fles-settings { display: block !important; }' +
        'div#fles-menu { box-sizing: content-box !important; position: fixed; ' +
            'display: none; flex-direction: column; top: 1%; left: 1%; right: 1%; height: 375px; padding: 1%; ' +
            'border: solid 2px #CC0000; ' + 'border-radius: 10px; background-color: rgba(0,0,0,0.9); ' +
            'z-index: 100000000; } ');
    notifyBar.querySelector('a#fles-settings').addEventListener('click', openFlesSettings);
    document.querySelector('body').insertAdjacentHTML('beforeEnd', '<div id="fles-menu"</div>');
    const flesMenu = document.querySelector('div#fles-menu');
    flesMenu.insertAdjacentHTML('afterBegin','<div id="fles-header"></div><div id="fles-content"></div><div id="fles-footer"></div>');
    const flesHeader = document.querySelector('div#fles-header');
    const flesFooter = document.querySelector('div#fles-footer');
    flesHeader.insertAdjacentHTML('afterBegin','<h1 id="fles-header">FetLife Enhancement Suite</h1>');
    flesFooter.insertAdjacentHTML('beforeEnd', '<button id="fles-close" class="fles-button">Close Settings</button>');
    flesFooter.querySelector('button#fles-close').addEventListener('click',function(){
        flesMenu.style.display = 'none';
        document.getElementById('fles-menu-normalize').parentElement.removeChild(document.getElementById('fles-menu-normalize'));
        document.querySelector('a#fles-settings').addEventListener('click', openFlesSettings);
    });
    const flesContent = document.querySelector('div#fles-content');
    flesContent.insertAdjacentHTML('afterBegin', '<div id="fles-toc"><ul id="fles-toc-list">' +
        '<li id="fles-toc-about"><h3 class="fles-toc-h3">About FLES</h3></li>' +
        '<li id="fles-global"><h3 class="fles-toc-h3">Global Features</h3></li>' +
        '<li id="fles-toc-localization"><h3 class="fles-toc-h3">Localization</h3></li>' +
        '<li id="fles-toc-profiles"><h3 class="fles-toc-h3">Profiles</h3></li>' +
        '<li id="fles-toc-groups"><h3 class="fles-toc-h3">Groups</h3></li>' +
        '<li id="fles-toc-messaging"><h3 class="fles-toc-h3">Messaging</h3></li>' +
        '</ul></div>');
    const flesTocList = document.querySelector('ul#fles-toc-list');
    flesTocList.querySelectorAll('li').forEach(function(listElement) {
       listElement.addEventListener('click',switchSetting);
    });
    flesContent.insertAdjacentHTML('beforeEnd','<div id="fles-body"><p>Thanks for choosing FLES!</p></div>');
}

function openFlesSettings() {
    // Set up normalization style sheet
    const htmlHead = document.querySelector('html head');
    htmlHead.insertAdjacentHTML('beforeEnd','<style id="fles-menu-normalize">' + GM_getResourceText('normalize4ab3de5') + '</style>');

    // Set up FLES style sheet
    GM_addStyle(
        'div#fles-header { display: inherit; margin: 1%; flex: 0 0 70px; } ' +
        'div#fles-content { display: inherit; flex: 0 0 230px; } ' +
        'div#fles-footer { display: inherit; flex: 0 0 50px; justify-content: flex-end; } ' +
        'div#fles-toc { } ' +
        'div#fles-body { margin: 1em; } ' +
        'div#fles-body p { margin: 0; } ' +
        'table#fles-settings { width: auto; margin: 1em; vertical-align: middle; border-collapse: separate; ' +
            'border-spacing: 0; } ' +
        'table#fles-settings th.section_header { border-bottom: 1px solid #555; font-weight: normal; ' +
            'vertical-align: top; padding: 4px 10px 4px 5px; } ' +
        'table#fles-settings td { padding: 4px 10px 4px 5px; vertical-align: middle; text-align: left; ' +
            'font-weight: normal; } ' +
        'table#fles-settings td.option { text-align: center; padding: 4px 10px 4px 5px; vertical-align: middle; ' +
            'font-weight: normal; } ' +
        'button.fles-button { margin: 1%; border-color: black; border-radius: 5px; background-color: #777; } ' +
        'button#fles-close { } ' +
        'ul#fles-toc-list { list-style-type: none; } ' +
        'ul#fles-toc-list > li { margin-top: 10%; cursor: pointer; } ' +
        'h1#fles-header { line-height: 36px; font-family: serif; font-weight: bold; font-size: 2em; ' +
            'letter-spacing: 0px; color: #CC0000; text-decoration: underline; text-decoration-color: #777; } ' +
        'h3.fles-toc-h3 { margin: 0; padding: 0; line-height: 26px; font-size: 26px; font-weight: normal; ' +
            'letter-spacing: -1px; color: #777; } ' +
        'h3.fles-toc-h3-active { color: #FFF; }');

    document.querySelector('a#fles-settings').removeEventListener('click', openFlesSettings);
    document.querySelector('div#fles-menu').style.display = 'flex';
}

function addCheckboxEvent(optionNode)
{
    optionNode.querySelectorAll('input[type=checkbox]').forEach(function(element) {
        element.addEventListener('change', processCheckbox);
        if (GM_getValue(element.id)) element.setAttribute('checked', '');
    });

    optionNode.querySelectorAll('input[type=color]').forEach(function(element) {
        element.addEventListener('change', processColor);
        if (GM_getValue(element.id)) element.setAttribute('value', GM_getValue(element.id));
    });
}

function processCheckbox(event) {
    GM_setValue(event.target.id, event.target.checked);
}

function processColor(event) {
    GM_setValue(event.target.id, event.target.value);
}

function switchSetting() {
    let h3ActiveNode = this.parentElement.parentElement.querySelector('h3.fles-toc-h3-active');
    if( h3ActiveNode ) {
        h3ActiveNode.classList.remove('fles-toc-h3-active');
    }
    this.firstElementChild.classList.add('fles-toc-h3-active');
    const flesBody = document.querySelector('div#fles-body');

    switch( this.id ) {
        case 'fles-toc-about' : {
            let aboutNode = document.createElement('span');
            aboutNode.insertAdjacentHTML('afterBegin', '<h4>Q: What is the FL Enhancement Suite?</h4><p>A: The FL Enhancement Suite is a <a href="https://en.wikipedia.org/wiki/Userscript" target="_blank">UserScript</a> that can be added to the <a href="https://tampermonkey.net/" target="_blank">Tampermonkey</a> (or like) plug-in. The purpose of the script is to provide customization of the user interface built by the FetLife team. The script will <b>not</b> add functionality that is included when a user <a href="/support?ici=footer--support-fetlife&icn=support-fetlife" target="_blank">supports</a> FetLife.</p>');
            if (flesBody.firstElementChild) {
                flesBody.replaceChild(aboutNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(aboutNode);
            addCheckboxEvent(aboutNode);
            break;
        }
        case 'fles-toc-localization': {
            let localNode = document.createElement('span');
            localNode.insertAdjacentHTML('afterBegin', '<p>The settings below are designed to improve the localized aspect of your FetLife user experience by adjusting datestamps, timezones, and other like attributes.</p>');
            localNode.insertAdjacentHTML('beforeEnd', '<table id="fles-settings"><tbody><tr id="timestamp_expansion"><th class="section_header">Timestamp Expansion</th><th class="section_header">Enabled?</th></tr>' +
                '<tr><td><label for="timestamp_group">Expand timestamps in individual Group Pages</label></td><td class="option"><input type="checkbox" id="timestamp_group" name="timestamp_group"/></td></tr>' +
                '<tr><td><label for="timestamp_groups">Expand timestamps in main Groups Page</label></td><td class="option"><input type="checkbox" id="timestamp_groups" name="timestamp_groups"/></td></tr>' +
                '</tbody></table>');
            if (flesBody.firstElementChild) {
                flesBody.replaceChild(localNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(localNode);
            addCheckboxEvent(localNode);
            break;
        }
        case 'fles-toc-profiles': {
            let profileNode = document.createElement('span');
            profileNode.insertAdjacentHTML('afterBegin','<p>The settings below are designed to improve an aspect of profile pages.</p>');
            profileNode.insertAdjacentHTML('beforeEnd', '<table id="fles-settings"><tbody><tr id="profile_changes"><th class="section_header">Profile Page Modifications</th><th class="section_header">Enabled?</th></tr>' +
                '<tr><td><label for="redirect_avatar_to_gallery">Redirect click on avatar to full image in gallery</label></td><td class="option"><input type="checkbox" id="redirect_avatar_to_gallery" name="redirect_avatar_to_gallery"/></td></tr>' +
                '<tr><td><label for="clickable_friend_categories">Enable clickable links for friends/followers/following categories</label></td><td class="option"><input type="checkbox" id="clickable_friend_categories" name="clickable_friend_categories"/></td></tr>' +
                '<tr><td><label for="common_kink_highlight">Highlight common kinks</label></td><td class="option"><input type="checkbox" id="common_kink_highlight" name="common_kink_highlight"/></td></tr>' +
                '<tr><td><label for="common_kink_highlight-color">Highlight color for common kinks</label></td><td class="option"><input type="color" id="common_kink_highlight-color" name="common_kink_highlight-color"/><td></tr>' +
                '<tr><td><label for="show_mutual_followers">Show Mutual Followers</label></td><td class="option"><input type="checkbox" id="show_mutual_followers" name="show_mutual_followers"/></td></tr>' +
                '<tr><td><label for="reply_to_image_owner">Mention image owner in comment</label></td><td class="option"><input type="checkbox" id="reply_to_image_owner" name="reply_to_image_owner"/></td></tr>' +
                '<tr><td><label for="collapse_user_posts">Collapse List of User\'s Writings</label></td><td class="option"><input type="checkbox" id="collapse_user_posts" name="collapse_user_posts"/></td></tr>' +
                '</tbody></table>');
            if( flesBody.firstElementChild ) {
                flesBody.replaceChild(profileNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(profileNode);
            addCheckboxEvent(profileNode);
            break;
        }
        case 'fles-toc-groups': {
            let groupNode = document.createElement('span');
            groupNode.insertAdjacentHTML('afterBegin','<p>The settings below are designed to improve an aspect of group pages.</p>');
            groupNode.insertAdjacentHTML('beforeEnd', '<table id="fles-settings"><tbody>' +
                '<tr id="group_options"><th class="section_header">Group Options</th><th class="section_header">Enabled?</th></tr>' +
                '<tr><td><label for="group_new_discussion">Redirect to new discussions when visiting group</label></td><td class="option"><input type="checkbox" id="group_new_discussion" name="group_new_discussion"/></td></tr>' +
                '<tr><td><label for="group_link_to_last_comment">Change link for followed discussion to last comment</label></td><td class="option"><input type="checkbox" id="group_link_to_last_comment" name="group_link_to_last_comment"/></td></tr>' +
                '<tr><td><label for="inline-image-in-subgroup">Enable ability to toggle inline images in group discussion</label></td><td class="option"><input type="checkbox" id="inline-image-in-subgroup" name="inline-image-in-subgroup"/></td></tr>' +
                '<tr><td><label for="multi-reply-in-subgroup">Enable multi-reply in group discussion</label></td><td class="option"><input type="checkbox" id="multi-reply-in-subgroup" name="multi-reply-in-subgroup"/></td></tr>' +
                '<tr><td><label for="reply-to-op-in-subgroup">Enable ability to reply to the original poster in a group discussion</label></td><td class="option"><input type="checkbox" id="reply-to-op-in-subgroup" name="reply-to-op-in-subgroup"/></td></tr>' +
                '<tr><td><label for="quote-in-group">Enable ability to quote directly into the message box via copy</label></td><td class="option"><input type="checkbox" id="quote-in-group" name="quote-in-group"/></td></tr>' +
                '</tbody></table>');
            if( flesBody.firstElementChild ) {
                flesBody.replaceChild(groupNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(groupNode);
            addCheckboxEvent(groupNode);
            break;
        }
        case 'fles-toc-messaging': {
            let messageNode = document.createElement('span');
            // pm_message_box_cursor
            messageNode.insertAdjacentHTML('afterBegin','<p>The settings below are designed to improve an aspect of the private messaging interface.</p>');
            messageNode.insertAdjacentHTML('beforeEnd', '<table id="fles-settings"><tbody>' +
                '<tr id="pm_options"><th class="section_header">Private Message Options</th><th class="section_header">Enabled?</th></tr>' +
                '<tr><td><label for="pm_message_box_cursor_new">Enable automatic message box cursor placement for new message</label></td><td class="option"><input type="checkbox" id="pm_message_box_cursor_new" name="pm_message_box_cursor_new"/></td></tr>' +
                '<tr><td><label for="pm_message_box_cursor_active">Enable automatic message box cursor placement for active conversation</label></td><td class="option"><input type="checkbox" id="pm_message_box_cursor_active" name="pm_message_box_cursor_active"/></td></tr>' +
                '</tbody></table>');
            if( flesBody.firstElementChild ) {
                flesBody.replaceChild(messageNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(messageNode);
            addCheckboxEvent(messageNode);
            break;
        }
        case 'fles-global': {
            let messageNode = document.createElement('span');
            // pm_message_box_cursor
            messageNode.insertAdjacentHTML('afterBegin','<p>The settings below are global features that effect all pages.</p>');
            messageNode.insertAdjacentHTML('beforeEnd', '<table id="fles-settings"><tbody>' +
                '<tr id="pm_options"><th class="section_header">Global Features</th><th class="section_header">Enabled?</th></tr>' +
                '<tr><td><label for="global-float_navbar">Enable floating navigation bar</label></td><td class="option"><input type="checkbox" id="global-float_navbar" name="global-float_navbar"/></td></tr>' +
                '</tbody></table>');
            if( flesBody.firstElementChild ) {
                flesBody.replaceChild(messageNode, flesBody.firstElementChild);
            }
            else flesBody.appendChild(messageNode);
            addCheckboxEvent(messageNode);
            break;
        }
    }
}

function addGlobalFeatures() {
    // Enable floating navbar
    if( GM_getValue('global-float_navbar') )
    {
        let navbar = document.querySelector('nav.fl-nav');
        navbar.setAttribute('style','position:sticky;position: -webkit-sticky;top: 0;left: 0;right:0');
    }
}

// Add FLES Settings to all pages
addFlesSettings();
GM_addStyle('a.fles-link { cursor: pointer; } span.fles-kink { color: #CC0000; font-weight: 800; }');

// Add Global Features
addGlobalFeatures();

// Page handling
const groupsRE = new RegExp('^https://fetlife.com/groups$');
const groupSubRE = new RegExp('^https://fetlife.com/groups/[0-9]*.*$');
const groupPostRE = new RegExp('^https://fetlife.com/groups/[0-9]*/group_posts/[0-9]*');
const profileRE = new RegExp('^https://fetlife.com/users/[0-9]*$');
const pictureRE = new RegExp('^https://fetlife.com/users/[0-9]*/pictures/[0-9]*$');
const postsRE = new RegExp('^https://fetlife.com/users/[0-9]*/posts$');
const convNewRE = new RegExp('^https://fetlife.com/conversations/new.*$');
const inboxRE = new RegExp('^https://fetlife.com/inbox.*$');
const settingsRespRE = new RegExp('^https://fetlife.com/settings/responsive/.*$');
const pageLocation = window.location.href;

switch(pageLocation) {
    case (pageLocation.match(groupPostRE) || {}).input:
        adjustGroupPost();
        break;
    case (pageLocation.match(groupSubRE) || {}).input:
        adjustSubGroup();
        break;
    case (pageLocation.match(groupsRE) || {}).input:
        adjustGroup();
        break;
    case (pageLocation.match(postsRE) || {}).input:
        adjustPosts();
        break;
    case (pageLocation.match(pictureRE) || {}).input:
        adjustPicture();
        break;
    case (pageLocation.match(profileRE) || {}).input:
        adjustProfile();
        break;
    case (pageLocation.match(convNewRE) || {}).input:
        adjustNewConv();
        break;
    case (pageLocation.match(inboxRE) || {}).input:
        adjustInbox();
        break;
    case (pageLocation.match(settingsRespRE) || {}).input:
        adjustSettingsResp();
        break;
}
