/* Keep a confirmed background choice reversible, including after draft recovery. */
(function(root){
'use strict';
const keys=['backgroundWithLetters','automaticArtwork','bookArtwork','bookArtworkRegion'];
function canRestore(article){return !!article?.bookCover&&article.previousArtworkBackground?.source===root.RevistaArtwork.fingerprint(article.bookCover)&&article.previousArtworkBackground.values&&typeof article.previousArtworkBackground.values==='object';}
function apply(article,source,result){
 if(article.bookCover!==source||!root.RevistaArtwork.valid({bookCover:source,automaticArtwork:result}))return false;
 const values={};for(const key of keys)if(Object.hasOwn(article,key))values[key]=structuredClone(article[key]);
 article.previousArtworkBackground={source:root.RevistaArtwork.fingerprint(source),values};
 for(const key of keys)delete article[key];
 article.backgroundWithLetters=false;article.automaticArtwork=structuredClone(result);return true;
}
function restore(article){
 if(!canRestore(article))return false;
 const values=article.previousArtworkBackground.values;
 for(const key of keys){delete article[key];if(Object.hasOwn(values,key))article[key]=structuredClone(values[key]);}
 delete article.previousArtworkBackground;return true;
}
root.RevistaBackgroundChoice={apply,restore,canRestore};
})(globalThis);
