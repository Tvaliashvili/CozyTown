// The privacy notice, in plain words. Every sentence must stay true to how the site really works:
// when a feature changes what we keep or who can see it, change this text too (and `updated`
// in company.js). Georgian is a DRAFT until the founder (and ideally a lawyer) reviews it.

export function privacyText(lang, c) {
  return lang === 'ka' ? ka(c) : en(c)
}

function en(c) {
  return {
    title: 'Privacy',
    intro: `Cozy Town keeps your memories: photos, letters and time capsules. This page says what we keep, who can see it, and how to get it back or have it deleted. Cozy Town is run by ${c.nameEn} (ID ${c.idNumber}), ${c.addressEn}. Questions: ${c.contact}.`,
    sections: [
      {
        heading: 'Your memories are yours',
        paragraphs: [
          'The photos, letters and words you put in a house belong to you. We keep them only to show them in your house. We never sell them, never use them for advertising and never show them to anyone you have not given the link to.',
          'You can download everything at any time with "Download everything" at the bottom of the room. If we ever close, we will tell keepers at least 6 months before, so there is time to download.',
        ],
      },
      {
        heading: 'What we keep',
        paragraphs: [
          'For keepers and helpers: your email address and your password. The password is stored scrambled, so nobody, including us, can read it.',
          'In each house: the outside design, the house name, photos with their captions, letters, the time capsule, the list of helpers and the lanterns visitors light.',
          'For visitors: nothing, unless you light a lantern. A lantern keeps the name and words you choose to write, both optional. You need no account.',
          'For orders: the buyer\'s name, how to reach them, the price and a note, so we can deliver the gift. Only we see this.',
          'Photos are made smaller on your phone before they are sent. This also removes hidden information inside the photo, such as where it was taken.',
        ],
      },
      {
        heading: 'Who can see what',
        paragraphs: [
          'A house is private. It opens only with its link or QR code, which is long and impossible to guess.',
          'Anyone with the link can see the outside of the house, all the photos in the house (on the walls and in the album) with their captions, and how many lanterns are lit. The outside can show small signs: a raised mailbox flag when a new letter is waiting, and a gift box when the time capsule\'s day has come. They cannot read letters or see what is in the time capsule.',
          'Letters are for the keeper only. Helpers see only the letters they wrote themselves.',
          'The time capsule stays locked until its day, for everyone, including the keeper and us.',
          'People walking down the street in the app see only the outside of houses, never what is inside. The only sign they can see on other houses is a gift bow on a gift nobody has claimed yet. The town map works the same way: anyone can look along the streets that are open, without a link, and sees only the outsides, with no names.',
          'Each photo file has a long random address. Someone who has that exact address, for example because a visitor saved or forwarded the photo, can open it. Please keep that in mind with very private photos.',
        ],
      },
      {
        heading: 'Photos of children, and memorial houses',
        paragraphs: [
          'Please share photos of other people, especially children, only if you are allowed to and they or their parents would be happy with it. Think about who has the link.',
          'For a house in memory of someone, the same rules apply: only the people you give the link to can open it. If you tell us a house is a memorial, we mark it so it never shows a gift bow or a gift box. Visitors are not told about this mark.',
          'The town has a quiet neighbourhood for memorial houses, the Garden Quarter. A house there can be recognised as a memorial house by anyone looking at the town map, because that is what the quarter is for. The buyer chooses whether a house goes there.',
          'The keeper can take any photo down at any time.',
        ],
      },
      {
        heading: 'Where it is stored',
        paragraphs: [
          'The database and the photos are kept by Supabase in Frankfurt, Germany (EU). The website is delivered by Cloudflare.',
          'Every night a copy of everything is made for safety, locked with a key only we hold, and kept in Cloudflare\'s storage. The job that makes this copy runs on GitHub\'s servers. We keep the last 30 nightly copies and one copy per month for a year.',
          'These companies run the computers for us. They do not use your memories for their own purposes.',
        ],
      },
      {
        heading: 'Who at Cozy Town can see it',
        paragraphs: [
          'Our admin page does not show letters. We look at the content of a house only when you ask us for help, to fix a problem, to restore a backup, or when the law requires it.',
        ],
      },
      {
        heading: 'What your browser keeps',
        paragraphs: [
          'Your browser remembers your language and, if you sign in, that you are signed in. The demo street remembers your design in your browser. We use no advertising cookies and no tracking.',
          'Like every website, our providers keep short technical records, such as internet addresses, to keep the service safe and working.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'As long as the house exists. When you delete a photo or a letter, it is gone from the house straight away. It disappears from the safety copies as they are replaced, at the latest after a year.',
          'If you want a whole house or your account deleted, write to us and we will do it.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          `Under the Law of Georgia on Personal Data Protection you can ask what we keep about you, ask us to correct it or delete it, and get a copy. Write to ${c.contact}. If you are not happy with our answer, you can complain to the Personal Data Protection Service of Georgia.`,
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'If we change this notice in a way that matters, keepers will see a message when they next open their house.',
        ],
      },
    ],
  }
}

function ka(c) {
  return {
    title: 'კონფიდენციალურობა',
    intro: `მყუდრო ქალაქი ინახავს თქვენს მოგონებებს: ფოტოებს, წერილებს და დროის კაფსულებს. ამ გვერდზე წერია, რას ვინახავთ, ვის შეუძლია მისი ნახვა და როგორ შეგიძლიათ მისი დაბრუნება ან წაშლა. მყუდრო ქალაქს მართავს ${c.nameKa} (ს/კ ${c.idNumber}), ${c.addressKa}. კითხვებისთვის: ${c.contact}.`,
    sections: [
      {
        heading: 'თქვენი მოგონებები თქვენია',
        paragraphs: [
          'ფოტოები, წერილები და სიტყვები, რომლებსაც სახლში ათავსებთ, თქვენ გეკუთვნით. მათ ვინახავთ მხოლოდ იმისთვის, რომ თქვენს სახლში გამოჩნდეს. არასდროს ვყიდით, არ ვიყენებთ რეკლამისთვის და არავის ვაჩვენებთ, ვისაც ბმული არ მიეცით.',
          'ნებისმიერ დროს შეგიძლიათ ყველაფრის ჩამოტვირთვა ღილაკით „ყველაფრის ჩამოტვირთვა“ ოთახის ბოლოში. თუ ოდესმე დავიხურებით, მეპატრონეებს სულ მცირე 6 თვით ადრე ვაცნობებთ, რომ ჩამოტვირთვა მოასწრონ.',
        ],
      },
      {
        heading: 'რას ვინახავთ',
        paragraphs: [
          'მეპატრონეებისა და დამხმარეებისთვის: ელფოსტის მისამართს და პაროლს. პაროლი დაშიფრულად ინახება, ამიტომ მის წაკითხვას ვერავინ შეძლებს, მათ შორის ჩვენც.',
          'თითოეულ სახლში: გარე დიზაინს, სახლის სახელს, ფოტოებს წარწერებით, წერილებს, დროის კაფსულას, დამხმარეების სიას და სტუმრების მიერ ანთებულ ფარნებს.',
          'სტუმრებისთვის: არაფერს, თუ ფარანს არ აანთებთ. ფარანი ინახავს სახელს და სიტყვებს, თუ მათ დაწერთ (ორივე არასავალდებულოა). ანგარიში საჭირო არ არის.',
          'შეკვეთებისთვის: მყიდველის სახელს, საკონტაქტო ინფორმაციას, ფასს და შენიშვნას, რომ საჩუქარი ჩავაბაროთ. ამას მხოლოდ ჩვენ ვხედავთ.',
          'ფოტოები გაგზავნამდე თქვენსავე ტელეფონზე პატარავდება. ამ დროს ფოტოდან იშლება დამალული ინფორმაციაც, მაგალითად, სად იყო გადაღებული.',
        ],
      },
      {
        heading: 'ვინ რას ხედავს',
        paragraphs: [
          'სახლი პირადია. ის მხოლოდ თავისი ბმულით ან QR კოდით იხსნება, რომელიც გრძელია და მისი გამოცნობა შეუძლებელია.',
          'ვისაც ბმული აქვს, ხედავს სახლის გარე მხარეს, სახლის ყველა ფოტოს (კედლებზე და ალბომში) წარწერებით და რამდენი ფარანი ანთია. გარე მხარეს შეიძლება პატარა ნიშნები გამოჩნდეს: აწეული დროშა საფოსტო ყუთზე, როცა ახალი წერილი ელოდება, და საჩუქრის ყუთი, როცა დროის კაფსულის დღე დადგება. წერილების წაკითხვა და დროის კაფსულის შიგთავსის ნახვა არ შეუძლია.',
          'წერილები მხოლოდ მეპატრონისთვისაა. დამხმარეები მხოლოდ საკუთარ წერილებს ხედავენ.',
          'დროის კაფსულა დაკეტილია თავის დღემდე ყველასთვის, მათ შორის მეპატრონისთვის და ჩვენთვისაც.',
          'ვინც აპლიკაციაში ქუჩას ათვალიერებს, მხოლოდ სახლების გარე მხარეს ხედავს და არასდროს იმას, რაც შიგნითაა. სხვა სახლებზე ერთადერთი ნიშანი, რაც მას შეუძლია დაინახოს, საჩუქრის ბაფთაა იმ საჩუქარზე, რომელიც ჯერ არავის მიუღია. ქალაქის რუკაც ასევე მუშაობს: ნებისმიერს შეუძლია ბმულის გარეშე დაათვალიეროს გახსნილი ქუჩები და ხედავს მხოლოდ სახლების გარე მხარეს, სახელების გარეშე.',
          'თითოეულ ფოტოს გრძელი შემთხვევითი მისამართი აქვს. ვისაც ზუსტად ეს მისამართი აქვს (მაგალითად, სტუმარმა ფოტო შეინახა ან გადააგზავნა), შეუძლია მისი გახსნა. ძალიან პირადი ფოტოების შემთხვევაში ეს გაითვალისწინეთ.',
        ],
      },
      {
        heading: 'ბავშვების ფოტოები და მოსაგონარი სახლები',
        paragraphs: [
          'სხვა ადამიანების, განსაკუთრებით ბავშვების, ფოტოები გააზიარეთ მხოლოდ მაშინ, თუ ამის უფლება გაქვთ და ისინი ან მათი მშობლები ამას სიამოვნებით მიიღებენ. დაფიქრდით, ვის აქვს ბმული.',
          'ვინმეს მოსაგონარ სახლზეც იგივე წესები მოქმედებს: მისი გახსნა მხოლოდ მათ შეუძლიათ, ვისაც ბმულს მისცემთ. თუ გვეტყვით, რომ სახლი მოსაგონარია, მას მოვნიშნავთ, რომ მასზე საჩუქრის ბაფთა და საჩუქრის ყუთი არასდროს გამოჩნდეს. სტუმრები ამ ნიშნის შესახებ ვერ გაიგებენ.',
          'ქალაქს მოსაგონარი სახლებისთვის მშვიდი უბანი აქვს, ბაღების უბანი. იქ მდგარი სახლი ქალაქის რუკაზე ყველასთვის ამოსაცნობია როგორც მოსაგონარი სახლი, რადგან ეს უბანი სწორედ ამისთვისაა. მყიდველი თავად წყვეტს, იქ იდგეს თუ არა სახლი.',
          'მეპატრონეს ნებისმიერი ფოტოს ჩამოხსნა ნებისმიერ დროს შეუძლია.',
        ],
      },
      {
        heading: 'სად ინახება',
        paragraphs: [
          'მონაცემთა ბაზას და ფოტოებს ინახავს Supabase ფრანკფურტში, გერმანია (ევროკავშირი). ვებგვერდს აწვდის Cloudflare.',
          'ყოველ ღამე უსაფრთხოებისთვის ყველაფრის ასლი კეთდება, იკეტება გასაღებით, რომელიც მხოლოდ ჩვენ გვაქვს, და ინახება Cloudflare-ის საცავში. ასლს ამზადებს პროგრამა, რომელიც GitHub-ის სერვერებზე მუშაობს. ვინახავთ ბოლო 30 ღამის ასლს და თითო ასლს ყოველი თვიდან, ერთი წლის განმავლობაში.',
          'ეს კომპანიები ჩვენთვის მართავენ კომპიუტერებს. თქვენს მოგონებებს საკუთარი მიზნებისთვის არ იყენებენ.',
        ],
      },
      {
        heading: 'ვის შეუძლია ნახვა მყუდრო ქალაქში',
        paragraphs: [
          'ჩვენი ადმინისტრატორის გვერდი წერილებს არ აჩვენებს. სახლის შიგთავსს ვუყურებთ მხოლოდ მაშინ, როცა დახმარებას გვთხოვთ, პრობლემის გამოსასწორებლად, ასლის აღსადგენად ან როცა ამას კანონი მოითხოვს.',
        ],
      },
      {
        heading: 'რას იმახსოვრებს თქვენი ბრაუზერი',
        paragraphs: [
          'თქვენი ბრაუზერი იმახსოვრებს ენას და, თუ შეხვედით, რომ შესული ხართ. სადემონსტრაციო ქუჩა თქვენს დიზაინს ბრაუზერში იმახსოვრებს. სარეკლამო ქუქი-ფაილებს და თვალთვალს არ ვიყენებთ.',
          'როგორც ყველა ვებგვერდთან, ჩვენი მომწოდებლები ინახავენ მოკლე ტექნიკურ ჩანაწერებს, მაგალითად ინტერნეტ მისამართებს, სერვისის უსაფრთხოებისა და მუშაობისთვის.',
        ],
      },
      {
        heading: 'რამდენ ხანს ვინახავთ',
        paragraphs: [
          'სანამ სახლი არსებობს. ფოტოს ან წერილის წაშლისას ის სახლიდან მაშინვე ქრება. უსაფრთხოების ასლებიდან ქრება მათი განახლებისას, არაუგვიანეს ერთი წლისა.',
          'თუ გსურთ მთელი სახლის ან ანგარიშის წაშლა, მოგვწერეთ და წავშლით.',
        ],
      },
      {
        heading: 'თქვენი უფლებები',
        paragraphs: [
          `„პერსონალურ მონაცემთა დაცვის შესახებ“ საქართველოს კანონის მიხედვით, შეგიძლიათ გაიგოთ, რას ვინახავთ თქვენ შესახებ, მოითხოვოთ მისი შესწორება ან წაშლა და მიიღოთ ასლი. მოგვწერეთ: ${c.contact}. თუ ჩვენი პასუხი არ მოგეწონათ, შეგიძლიათ მიმართოთ პერსონალურ მონაცემთა დაცვის სამსახურს.`,
        ],
      },
      {
        heading: 'ცვლილებები',
        paragraphs: [
          'თუ ამ ტექსტს მნიშვნელოვნად შევცვლით, მეპატრონეები შეტყობინებას დაინახავენ, როცა სახლს შემდეგ ჯერზე გახსნიან.',
        ],
      },
    ],
  }
}
