const face=(family:string,ranges:string[])=>({url:`/fonts/${family}-Regular.ttf`,'unicode-range':ranges});
export const mapFonts={'Noto Sans Regular':[
face('NotoNaskhArabic',['U+0600-06FF','U+0750-077F','U+08A0-08FF','U+FB50-FDFF','U+FE70-FEFF']),
face('NotoSansDevanagari',['U+0900-097F','U+A8E0-A8FF']),
face('NotoSansBengali',['U+0980-09FF']),
face('NotoSansTelugu',['U+0C00-0C7F'])]};
export const scriptSamples=['Español: España','English: United Kingdom','中文: 中国','हिन्दी: भारत','العربية: مصر','Français: France','Português: Brasil','বাংলা: বাংলাদেশ','Русский: Россия','اردو: پاکستان','Bahasa Indonesia','Deutsch: Deutschland','日本語: 日本','Türkçe: Türkiye','मराठी: भारत','Tiếng Việt: Việt Nam','తెలుగు: భారతదేశం','Kiswahili: Tanzania','Hausa: Najeriya','پنجابی: پاکستان'];
