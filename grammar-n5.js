'use strict';
// Grammar lessons. GRAMMAR is a shared global: grammar-n5.js defines it, grammar-n4.js appends to it.
// {id, level, title, sub, pattern, notes:[html], ex:[[sentence, translation], ...], quiz:[{q, o:[4 options], a:correct index, why}]}
// ids are saved-progress keys: never rename one. Sentences use the markup described in data.js; quizzes are plain text.
// ex is the lesson's reading feed, ordered from simplest to most varied.

const GRAMMAR = [
{id:'g1', level:'N5', title:'は and です', sub:'Topic and “to be”', pattern:'A は B です',
 notes:[
  `<b>は</b> (pronounced <b>wa</b> here) marks the topic, the thing you are talking about.`,
  `<b>です</b> is the polite “is / am / are”.`,
  `For the negative, use <b>ではありません</b> (or the more casual <b>じゃありません</b>).`,
  `Japanese often drops the subject when the context makes it obvious.`],
 ex:[['{私|わたし}[は]{学生|がくせい}[です]。','I am a student.'],['{田中|たなか}さん[は]{先生|せんせい}[です]。','Mr. Tanaka is a teacher.'],['これ[は]{本|ほん}[ではありません]。','This is not a book.']],
 quiz:[
  {q:'Fill the blank: 私＿学生です。',o:['は','を','に','で'],a:0,why:'は marks the topic: 私は学生です.'},
  {q:'“This is not a pen.” これはペン＿＿。',o:['ではありません','ですか','でした','です'],a:0,why:'ではありません (or じゃありません) is the polite negative of です.'},
  {q:'In 私は学生です, how is は pronounced?',o:['wa','ha','ba','o'],a:0,why:'As the topic particle, は is read “wa”.'},
  {q:'Which sentence means “Mr. Tanaka is a teacher”?',o:['田中さんは先生です。','田中さんを先生です。','田中さんに先生です。','田中さんで先生です。'],a:0,why:'Topic は + noun + です.'}]},
{id:'g2', level:'N5', title:'か', sub:'Asking questions', pattern:'～ですか / ～ますか',
 notes:[
  `Add <b>か</b> to the end of a sentence to turn it into a question. No change in word order is needed.`,
  `Answer with <b>はい</b> (yes) or <b>いいえ</b> (no).`,
  `Question words take the place of the answer: <b>何</b> (what), <b>誰</b> (who), <b>どこ</b> (where), <b>いつ</b> (when), <b>いくら</b> (how much).`],
 ex:[['あなたは{学生|がくせい}です[か]。','Are you a student?'],['[はい]、{学生|がくせい}です。','Yes, I am a student.'],['これは[{何|なん}]です[か]。','What is this?'],['トイレは[どこ]です[か]。','Where is the restroom?']],
 quiz:[
  {q:'Make it a question: 駅はどこ＿＿。',o:['ですか','です','でした','ません'],a:0,why:'Add か at the end to ask a question.'},
  {q:'Which word means “who”?',o:['誰','何','どこ','いくら'],a:0,why:'誰 (だれ) = who, 何 = what, どこ = where, いくら = how much.'},
  {q:'You want to know a price. Which question works?',o:['これはいくらですか。','これは誰ですか。','これはどこですか。','これは何時ですか。'],a:0,why:'いくら asks “how much”.'},
  {q:'Which word means “no”?',o:['いいえ','はい','ええ','どうぞ'],a:0,why:'いいえ = no. はい = yes.'}]},
{id:'g3', level:'N5', title:'の', sub:'Possession and linking nouns', pattern:'A の B',
 notes:[
  `<b>の</b> links two nouns. The first noun describes or owns the second: <b>私の本</b> = my book.`,
  `The order is the reverse of English “B of A”. The main noun, B, comes last.`,
  `の can also stand in for a noun you do not want to repeat: <b>私の</b> = mine.`],
 ex:[['{私|わたし}[の]{名前|なまえ}は{田中|たなか}です。','My name is Tanaka.'],['これは{先生|せんせい}[の]{本|ほん}です。','This is the teacher’s book.'],['{日本語|にほんご}[の]{本|ほん}','a Japanese-language book'],['この{傘|かさ}は{私|わたし}[の]です。','This umbrella is mine.']],
 quiz:[
  {q:'“My friend” = 私＿友達',o:['の','は','を','に'],a:0,why:'の links two nouns: 私の友達.'},
  {q:'Which means “the teacher’s car”?',o:['先生の車','車の先生','先生は車','先生を車'],a:0,why:'Owner first, then の, then the thing owned.'},
  {q:'“This umbrella is mine.” この傘は私＿です。',o:['の','が','も','を'],a:0,why:'私の stands in for “my umbrella”.'},
  {q:'In 日本語の先生, which noun is the main one?',o:['先生','日本語','Both equally','Neither'],a:0,why:'The noun after の is the main one: a teacher (of Japanese).'}]},
{id:'g4', level:'N5', title:'を', sub:'Objects and ます verbs', pattern:'Object を Verb ます',
 notes:[
  `<b>を</b> (pronounced <b>o</b>) marks the direct object, the thing the action is done to.`,
  `Polite verbs end in <b>ます</b>: 食べます (eat), 飲みます (drink), 見ます (see, watch), 読みます (read).`,
  `The verb always goes at the end of the sentence.`],
 ex:[['{水|みず}[を]{飲|の}み[ます]。','I drink water.'],['{本|ほん}[を]{読|よ}み[ます]。','I read a book.'],['{毎日|まいにち}、{日本語|にほんご}[を]{勉強|べんきょう}し[ます]。','I study Japanese every day.']],
 quiz:[
  {q:'Fill the blank: パン＿食べます。',o:['を','に','へ','で'],a:0,why:'を marks the direct object (what you eat).'},
  {q:'Where does the verb go in a Japanese sentence?',o:['At the end','At the start','Right after the subject','Anywhere'],a:0,why:'Japanese is verb-final: Object を Verb.'},
  {q:'Which means “I read the newspaper”?',o:['新聞を読みます。','新聞に読みます。','新聞で読みます。','読みます新聞を。'],a:0,why:'Object + を + verb at the end.'},
  {q:'How is the particle を pronounced?',o:['o','wa','e','ho'],a:0,why:'を is read “o”.'}]},
{id:'g5', level:'N5', title:'に and へ', sub:'Time and destination', pattern:'Place へ 行きます / Time に Verb',
 notes:[
  `<b>へ</b> (pronounced <b>e</b>) or <b>に</b> marks a destination with verbs of movement: 行く, 来る, 帰る.`,
  `<b>に</b> also marks a specific time: <b>七時に</b>起きます.`,
  `Words like 今日, 明日 and 毎日 usually don’t take に.`,
  `<b>に</b> marks the person you meet or give something to: 友達<b>に</b>会います.`],
 ex:[['{学校|がっこう}[へ]{行|い}きます。','I go to school.'],['{七時|しちじ}[に]{起|お}きます。','I get up at seven.'],['{明日|あした}、{東京|とうきょう}[に]{行|い}きます。','I am going to Tokyo tomorrow.'],['{友達|ともだち}[に]{会|あ}います。','I meet a friend.']],
 quiz:[
  {q:'Fill the blank: 七時＿起きます。',o:['に','で','を','へ'],a:0,why:'に marks a specific time.'},
  {q:'Which particle is read “e” and marks a destination?',o:['へ','に','を','は'],a:0,why:'へ (read “e”) points toward a destination.'},
  {q:'“I meet a friend.” 友達＿会います。',o:['に','を','で','へ'],a:0,why:'会う takes に for the person you meet.'},
  {q:'“I go home at six.” 六時＿家＿帰ります。',o:['に・へ','へ・に','を・を','で・に'],a:0,why:'Time takes に; destination takes へ (or に).'}]},
{id:'g6', level:'N5', title:'で', sub:'Place of action and means', pattern:'Place で Verb',
 notes:[
  `<b>で</b> marks the place where an action happens: 図書館<b>で</b>勉強します.`,
  `<b>で</b> also marks the means or tool: 電車<b>で</b>行きます (by train), 日本語<b>で</b>話します (in Japanese).`,
  `Compare: <b>に</b> is where something exists or where you go; <b>で</b> is where you do something.`],
 ex:[['{図書館|としょかん}[で]{本|ほん}を{読|よ}みます。','I read books at the library.'],['{電車|でんしゃ}[で]{会社|かいしゃ}へ{行|い}きます。','I go to the office by train.'],['レストラン[で]{晩|ばん}ご{飯|はん}を{食|た}べます。','I eat dinner at a restaurant.'],['{日本語|にほんご}[で]{話|はな}します。','I speak in Japanese.']],
 quiz:[
  {q:'“I take a walk in the park.” 公園＿散歩します。',o:['で','に','を','が'],a:0,why:'で marks where an action takes place.'},
  {q:'“I go by car.” 車＿行きます。',o:['で','を','は','も'],a:0,why:'で also marks the means or tool.'},
  {q:'Which particle marks the place where an action happens?',o:['で','へ','の','か'],a:0,why:'で = the place of an action.'},
  {q:'“I speak in Japanese.” 日本語＿話します。',o:['で','に','が','の'],a:0,why:'で marks the language used.'}]},
{id:'g7', level:'N5', title:'ます forms', sub:'Present, past, negative', pattern:'Vます / Vません / Vました / Vませんでした',
 notes:[
  `<b>食べます</b> = eat / will eat. The polite present also covers the future.`,
  `<b>食べません</b> = do not eat / will not eat.`,
  `<b>食べました</b> = ate.`,
  `<b>食べませんでした</b> = did not eat.`],
 ex:[['{毎朝|まいあさ}、パンを{食|た}べ[ます]。','I eat bread every morning.'],['{昨日|きのう}、{映画|えいが}を{見|み}[ました]。','I watched a movie yesterday.'],['{今日|きょう}は{勉強|べんきょう}し[ません]。','I will not study today.'],['{昨日|きのう}は{会社|かいしゃ}へ{行|い}き[ませんでした]。','I did not go to the office yesterday.']],
 quiz:[
  {q:'“I watched a movie yesterday.” 昨日、映画を＿＿。',o:['見ました','見ます','見ません','見ませんでした'],a:0,why:'Past tense: ます → ました.'},
  {q:'“I don’t drink coffee.” コーヒーを＿＿。',o:['飲みません','飲みました','飲みます','飲みませんでした'],a:0,why:'Negative: ます → ません.'},
  {q:'What does 行きませんでした mean?',o:['did not go','will go','went','do not go'],a:0,why:'ませんでした is the past negative.'},
  {q:'“I will go to Japan next year.” 来年、日本へ＿＿。',o:['行きます','行きました','行きません','行きませんでした'],a:0,why:'The polite present form also covers the future.'}]},
{id:'g8', level:'N5', title:'い-adjectives', sub:'Big, new, delicious', pattern:'Aい → Aいです / Aくないです / Aかったです',
 notes:[
  `い-adjectives end in <b>い</b>: 大きい, 新しい, 高い, おいしい. They go straight before a noun: <b>大きい</b>家.`,
  `Polite present: <b>高いです</b>. Negative: drop い and add <b>くないです</b> → 高くないです.`,
  `Past: drop い and add <b>かったです</b> → 高かったです. Past negative: <b>くなかったです</b>.`,
  `Exception: いい (good) becomes <b>よくないです</b> and <b>よかったです</b>.`],
 ex:[['この{時計|とけい}は[{高|たか}い]です。','This watch is expensive.'],['{今日|きょう}は[{暑|あつ}くない]です。','It is not hot today.'],['{映画|えいが}は[{面白|おもしろ}かった]です。','The movie was interesting.'],['{昨日|きのう}は[{寒|さむ}くなかった]です。','It was not cold yesterday.']],
 quiz:[
  {q:'“The movie was interesting.”',o:['映画は面白かったです。','映画は面白いでした。','映画は面白くでした。','映画は面白かったでした。'],a:0,why:'Drop い, add かったです.'},
  {q:'Which is the polite negative of 高いです?',o:['高くないです','高いじゃありません','高ないです','高いませんです'],a:0,why:'Drop い, add くないです.'},
  {q:'Which word is an い-adjective?',o:['新しい','静か','学校','食べる'],a:0,why:'新しい ends in い and describes a noun.'},
  {q:'“It was not cold yesterday.”',o:['昨日は寒くなかったです。','昨日は寒くないでした。','昨日は寒かったです。','昨日は寒いませんでした。'],a:0,why:'Past negative: くなかったです.'}]},
{id:'g9', level:'N5', title:'な-adjectives', sub:'Quiet, famous, liked', pattern:'Aな + noun / A です',
 notes:[
  `な-adjectives (静か, 元気, きれい, 好き, 有名) need <b>な</b> before a noun: 静か<b>な</b>部屋.`,
  `At the end of a sentence they work like nouns: <b>静かです</b>, <b>静かでした</b>, <b>静かではありません</b>.`,
  `Watch out: <b>きれい</b> ends in い but is a な-adjective.`,
  `<b>好き</b> takes が for the thing you like: 音楽<b>が</b>好きです.`],
 ex:[['[{静|しず}かな]{図書館|としょかん}です。','It is a quiet library.'],['{母|はは}は[{元気|げんき}です]。','My mother is well.'],['この{店|みせ}は[{有名|ゆうめい}ではありません]。','This shop is not famous.'],['{私|わたし}は{音楽|おんがく}[が{好|す}き]です。','I like music.']],
 quiz:[
  {q:'“A quiet room” = 静か＿部屋',o:['な','い','の','を'],a:0,why:'な links a な-adjective to a noun.'},
  {q:'Which of these is a な-adjective?',o:['きれい','新しい','大きい','高い'],a:0,why:'きれい ends in い but is a な-adjective.'},
  {q:'“It was quiet yesterday.” 昨日は静か＿＿。',o:['でした','かったです','くなかった','ました'],a:0,why:'な-adjectives take でした for the past.'},
  {q:'“I like music.” 音楽＿好きです。',o:['が','を','に','で'],a:0,why:'好き takes が for the thing you like.'}]},
{id:'g10', level:'N5', title:'あります / います', sub:'Things and living beings exist', pattern:'Place に Thing が あります',
 notes:[
  `<b>あります</b> is for things that do not move on their own. <b>います</b> is for people and animals.`,
  `Pattern: Place <b>に</b> Subject <b>が</b> あります / います.`,
  `Negative: <b>ありません</b> / <b>いません</b>.`,
  `Position words attach with の: 駅<b>の前</b> (in front of the station), 机<b>の上</b> (on the desk). Others: 下, 中, 後ろ, 近く.`],
 ex:[['{部屋|へや}[に]テレビ[があります]。','There is a TV in the room.'],['{公園|こうえん}[に]{子供|こども}[がいます]。','There are children in the park.'],['{駅|えき}の{前|まえ}[に]{銀行|ぎんこう}[があります]。','There is a bank in front of the station.'],['{家|いえ}[に]{猫|ねこ}[がいません]。','There is no cat at home.']],
 quiz:[
  {q:'“There is a TV in the room.”',o:['部屋にテレビがあります。','部屋にテレビがいます。','部屋でテレビがあります。','部屋にテレビをあります。'],a:0,why:'Place に + thing が + あります.'},
  {q:'“There is a dog in the park.” 公園に犬＿＿。',o:['がいます','があります','をいます','でいます'],a:0,why:'Animals and people use います.'},
  {q:'Which particle marks the place where something exists?',o:['に','で','を','へ'],a:0,why:'Existence uses に. で is for where actions happen.'},
  {q:'“I have no money.” お金が＿＿。',o:['ありません','いません','あります','ません'],a:0,why:'Money is not alive, so use ありません.'}]},
{id:'g11', level:'N5', title:'～たいです', sub:'Wanting to do', pattern:'Vます-stem + たいです',
 notes:[
  `Drop <b>ます</b> and add <b>たいです</b>: 食べます → <b>食べたいです</b> (I want to eat).`,
  `たい behaves like an い-adjective: <b>食べたくないです</b> (do not want to eat), <b>食べたかったです</b> (wanted to eat).`,
  `The object can take を or が: 水<b>を</b>飲みたいです / 水<b>が</b>飲みたいです.`,
  `Use it for your own wishes, or to ask someone: 何を食べたいですか。`],
 ex:[['{日本|にほん}へ[{行|い}きたいです]。','I want to go to Japan.'],['{寿司|すし}を[{食|た}べたいです]。','I want to eat sushi.'],['{今日|きょう}は[{勉強|べんきょう}したくないです]。','I do not want to study today.'],['{何|なに}を[{飲|の}みたいですか]。','What do you want to drink?']],
 quiz:[
  {q:'“I want to go to Japan.” 日本へ＿＿。',o:['行きたいです','行くたいです','行きますたいです','行きいです'],a:0,why:'Take the ます-stem (行き) and add たいです.'},
  {q:'How do you say “I don’t want to eat”?',o:['食べたくないです','食べたいません','食べますたくないです','食べたいじゃないです'],a:0,why:'たい works like an い-adjective: たい → たくない.'},
  {q:'Which asks “What do you want to drink?”',o:['何を飲みたいですか。','何を飲みますたいですか。','何が飲みましたいですか。','何を飲むたいですか。'],a:0,why:'ます-stem 飲み + たいですか.'},
  {q:'～たい conjugates like which kind of word?',o:['い-adjective','な-adjective','noun','ます verb'],a:0,why:'たい → たくない → たかった, just like an い-adjective.'}]},
{id:'g12', level:'N5', title:'～てください', sub:'Polite requests', pattern:'Vて + ください',
 notes:[
  `て-form + <b>ください</b> means “please do …”.`,
  `Ru-verbs: drop る, add て. 食べる → <b>食べて</b>, 見る → <b>見て</b>.`,
  `U-verbs change by ending: く → <b>いて</b> (書く → 書いて), む → <b>んで</b> (飲む → 飲んで), う・つ・る → <b>って</b> (会う → 会って, 待つ → 待って, 帰る → 帰って), す → <b>して</b> (話す → 話して).`,
  `Irregular: する → <b>して</b>, 来る → <b>来て</b>, 行く → <b>行って</b>.`],
 ex:[['ちょっと[{待|ま}ってください]。','Please wait a moment.'],['ここに{名前|なまえ}を[{書|か}いてください]。','Please write your name here.'],['ゆっくり[{話|はな}してください]。','Please speak slowly.'],['この{本|ほん}を[{読|よ}んでください]。','Please read this book.']],
 quiz:[
  {q:'“Please wait.” 待＿ください。',o:['って','いて','んで','して'],a:0,why:'つ-verbs: つ → って.'},
  {q:'What is the て-form of 飲む?',o:['飲んで','飲いて','飲って','飲して'],a:0,why:'む → んで.'},
  {q:'What is the て-form of 食べる?',o:['食べて','食べって','食べんで','食べいて'],a:0,why:'Ru-verbs: drop る, add て.'},
  {q:'“Please write your name.” 名前を＿ください。',o:['書いて','書って','書んで','書して'],a:0,why:'く → いて.'}]},
{id:'g13', level:'N5', title:'～ています', sub:'Ongoing actions and states', pattern:'Vて + います',
 notes:[
  `て-form + <b>います</b> shows an action in progress: 食べています = is eating.`,
  `It also shows a continuing state: <b>住んでいます</b> (I live in …), <b>働いています</b> (I work at …), <b>持っています</b> (I have).`,
  `Negative: <b>ていません</b>.`],
 ex:[['{今|いま}、ご{飯|はん}を[{食|た}べています]。','I am eating right now.'],['{雨|あめ}が[{降|ふ}っています]。','It is raining.'],['{東京|とうきょう}に[{住|す}んでいます]。','I live in Tokyo.'],['{銀行|ぎんこう}で[{働|はたら}いています]。','I work at a bank.']],
 quiz:[
  {q:'“He is watching TV.” 彼はテレビを＿＿。',o:['見ています','見ました','見ます','見ません'],a:0,why:'て-form + います = ongoing action.'},
  {q:'“I live in Tokyo.” 東京に＿＿。',o:['住んでいます','住みます','住みました','住んでください'],a:0,why:'Living somewhere is a continuing state.'},
  {q:'“It is raining (right now).”',o:['雨が降っています。','雨が降ります。','雨が降りません。','雨が降ってください。'],a:0,why:'て-form + います for something in progress.'},
  {q:'“I am not eating now.”',o:['今、食べていません。','今、食べません。','今、食べませんでした。','今、食べてください。'],a:0,why:'Negative of an ongoing action: ていません.'}]}
];
