// The terms of use, in plain words. Every promise here must match how the site really works and
// the settled decisions in CLAUDE.md (license not ownership, 6 months' notice, never "forever").
// Georgian is a DRAFT until the founder (and ideally a lawyer) reviews it.
// FOUNDER: the refund rule and the age limit below are proposals. Change them if you decide otherwise.

export function termsText(lang, c) {
  return lang === 'ka' ? ka(c) : en(c)
}

function en(c) {
  return {
    title: 'Terms of use',
    intro: `These are the rules for using Cozy Town (cozytown.ge). Cozy Town is run by ${c.nameEn} (ID ${c.idNumber}), ${c.addressEn}, called "we" below. Questions: ${c.contact}.`,
    sections: [
      {
        heading: 'What you get',
        paragraphs: [
          'When you buy a house, you get the right to use one house on our street, for as long as Cozy Town runs. Cozy Town itself, the street and the look of the houses stay ours. What you put inside, your photos and words, stays yours.',
          'You allow us to store your photos and words and show them to the people who open your house, because that is how the house works. Nothing more.',
        ],
      },
      {
        heading: 'Gift codes and keepers',
        paragraphs: [
          'Each house comes with a gift code. The first person to use it becomes the keeper: the one who looks after the house. A gift code works once, so keep it safe until it is used.',
          'The keeper can invite helpers to add photos, letters and things for the time capsule. The keeper can remove a helper at any time. What a helper added stays in the house.',
          'You must be 18 or older to buy a house or to make an account, or have permission from a parent or guardian.',
        ],
      },
      {
        heading: 'The outside of the house',
        paragraphs: [
          'The keeper designs the outside once. It can be changed freely until it is made final. After that, changing it again is a paid redesign (15 ₾). Photos, letters and lanterns can always be added.',
        ],
      },
      {
        heading: 'The time capsule',
        paragraphs: [
          'The time capsule opens on the day the keeper chooses. Before that day nobody can open it, not the keeper and not us, even if you ask. The day can be moved later, never earlier.',
        ],
      },
      {
        heading: 'What may go in a house',
        paragraphs: [
          'Only put in photos and words you have the right to share. Nothing illegal, hateful or hurtful to others, and no one else\'s private things without their permission.',
          'If something breaks these rules or the law, we may take it down. If it is serious, we may close the house. We will tell the keeper why, unless the law says we must not.',
        ],
      },
      {
        heading: 'Paying and refunds',
        paragraphs: [
          'Prices are in Georgian lari (₾). For now you pay by bank transfer, and we create the house once the payment arrives.',
          'If the gift code has not been used yet, you can ask for your money back within 14 days of paying. Printed cards and engraved keychains are made just for you, so they cannot be refunded once they are made.',
        ],
      },
      {
        heading: 'Our promise if we close',
        paragraphs: [
          'Your memories are always yours, and you can download everything at any time. If we ever close Cozy Town, we will tell keepers at least 6 months before, so there is time to download.',
          'We do not promise that Cozy Town will run forever. No one honestly can.',
        ],
      },
      {
        heading: 'If something goes wrong',
        paragraphs: [
          'We work hard to keep Cozy Town running and make a safety copy every night. Still, the site may sometimes be slow or unavailable, and we cannot promise it never will be. Please keep your own copy with "Download everything" now and then.',
          'As far as the law allows, if we are responsible for a loss, we pay back at most what you paid for the house.',
        ],
      },
      {
        heading: 'Changes to these terms',
        paragraphs: [
          'If we change these terms in a way that matters, keepers will see a message when they next open their house. Nothing changes for what you have already paid for without your agreement.',
        ],
      },
      {
        heading: 'Law',
        paragraphs: [
          'These terms follow the law of Georgia. If we cannot settle a disagreement together, the courts of Tbilisi decide. Your rights as a consumer under Georgian law always apply.',
        ],
      },
    ],
  }
}

function ka(c) {
  return {
    title: 'გამოყენების წესები',
    intro: `ეს არის მყუდრო ქალაქის (cozytown.ge) გამოყენების წესები. მყუდრო ქალაქს მართავს ${c.nameKa} (ს/კ ${c.idNumber}), ${c.addressKa}, ქვემოთ „ჩვენ“. კითხვებისთვის: ${c.contact}.`,
    sections: [
      {
        heading: 'რას იღებთ',
        paragraphs: [
          'სახლის ყიდვისას იღებთ ჩვენს ქუჩაზე ერთი სახლით სარგებლობის უფლებას, სანამ მყუდრო ქალაქი მუშაობს. თავად მყუდრო ქალაქი, ქუჩა და სახლების იერსახე ჩვენი რჩება. რასაც შიგნით ათავსებთ, თქვენი ფოტოები და სიტყვები, თქვენი რჩება.',
          'ჩვენ გვაძლევთ ნებას, შევინახოთ თქვენი ფოტოები და სიტყვები და ვაჩვენოთ ისინი მათ, ვინც თქვენს სახლს გახსნის, რადგან სახლი ასე მუშაობს. მეტს არაფერს.',
        ],
      },
      {
        heading: 'სასაჩუქრე კოდები და მეპატრონეები',
        paragraphs: [
          'ყველა სახლს თან ახლავს სასაჩუქრე კოდი. ვინც მას პირველი გამოიყენებს, ხდება მეპატრონე: ის, ვინც სახლს უვლის. სასაჩუქრე კოდი ერთხელ მუშაობს, ამიტომ გამოყენებამდე კარგად შეინახეთ.',
          'მეპატრონეს შეუძლია მოიწვიოს დამხმარეები, რომ დაამატონ ფოტოები, წერილები და ნივთები დროის კაფსულისთვის. მეპატრონეს შეუძლია დამხმარის მოხსნა ნებისმიერ დროს. რაც დამხმარემ დაამატა, სახლში რჩება.',
          'სახლის ყიდვა ან ანგარიშის შექმნა შეგიძლიათ 18 წლიდან, ან მშობლის ან მეურვის ნებართვით.',
        ],
      },
      {
        heading: 'სახლის გარე მხარე',
        paragraphs: [
          'მეპატრონე სახლის გარე მხარეს ერთხელ აწყობს. დასრულებამდე მისი თავისუფლად შეცვლა შეიძლება. ამის შემდეგ ხელახლა შეცვლა ფასიანი გადაკეთებაა (15 ₾). ფოტოების, წერილების და ფარნების დამატება ყოველთვის შეიძლება.',
        ],
      },
      {
        heading: 'დროის კაფსულა',
        paragraphs: [
          'დროის კაფსულა იხსნება იმ დღეს, რომელსაც მეპატრონე აირჩევს. ამ დღემდე მას ვერავინ გახსნის, ვერც მეპატრონე და ვერც ჩვენ, თუნდაც გვთხოვოთ. დღის გადაწევა შეიძლება მხოლოდ უფრო გვიან, ადრე არასდროს.',
        ],
      },
      {
        heading: 'რა შეიძლება იყოს სახლში',
        paragraphs: [
          'სახლში მოათავსეთ მხოლოდ ის ფოტოები და სიტყვები, რომელთა გაზიარების უფლებაც გაქვთ. არაფერი უკანონო, სიძულვილის შემცველი ან სხვისთვის მტკივნეული, და არავის პირადი რამ მისი ნებართვის გარეშე.',
          'თუ რამე ამ წესებს ან კანონს არღვევს, შეიძლება წავშალოთ. სერიოზულ შემთხვევაში შეიძლება სახლი დავხუროთ. მეპატრონეს მიზეზს ვეტყვით, თუ კანონი სხვას არ მოითხოვს.',
        ],
      },
      {
        heading: 'გადახდა და თანხის დაბრუნება',
        paragraphs: [
          'ფასები ქართულ ლარშია (₾). ჯერჯერობით გადახდა ხდება საბანკო გადარიცხვით და სახლს თანხის მიღების შემდეგ ვქმნით.',
          'თუ სასაჩუქრე კოდი ჯერ არ გამოყენებულა, გადახდიდან 14 დღის განმავლობაში შეგიძლიათ თანხის დაბრუნება მოითხოვოთ. დაბეჭდილი ბარათები და ამოტვიფრული ბრელოკები სპეციალურად თქვენთვის მზადდება, ამიტომ დამზადების შემდეგ მათი თანხა არ ბრუნდება.',
        ],
      },
      {
        heading: 'ჩვენი დაპირება, თუ დავიხურებით',
        paragraphs: [
          'თქვენი მოგონებები ყოველთვის თქვენია და ყველაფრის ჩამოტვირთვა ნებისმიერ დროს შეგიძლიათ. თუ ოდესმე მყუდრო ქალაქს დავხურავთ, მეპატრონეებს სულ მცირე 6 თვით ადრე ვაცნობებთ, რომ ჩამოტვირთვა მოასწრონ.',
          'არ გპირდებით, რომ მყუდრო ქალაქი სამუდამოდ იმუშავებს. ამას გულწრფელად ვერავინ დაგპირდებათ.',
        ],
      },
      {
        heading: 'თუ რამე არასწორად წავა',
        paragraphs: [
          'ვცდილობთ, მყუდრო ქალაქი გამართულად მუშაობდეს, და ყოველ ღამე უსაფრთხოების ასლს ვაკეთებთ. მიუხედავად ამისა, საიტი შეიძლება ზოგჯერ ნელა მუშაობდეს ან მიუწვდომელი იყოს და ვერ დაგპირდებით, რომ ეს არასდროს მოხდება. დროდადრო შეინახეთ საკუთარი ასლი ღილაკით „ყველაფრის ჩამოტვირთვა“.',
          'რამდენადაც კანონი იძლევა ამის საშუალებას, თუ ზარალზე ჩვენ ვართ პასუხისმგებელი, ვაბრუნებთ არაუმეტეს იმ თანხისა, რაც სახლში გადაიხადეთ.',
        ],
      },
      {
        heading: 'წესების ცვლილება',
        paragraphs: [
          'თუ ამ წესებს მნიშვნელოვნად შევცვლით, მეპატრონეები შეტყობინებას დაინახავენ, როცა სახლს შემდეგ ჯერზე გახსნიან. რაშიც უკვე გადაიხადეთ, თქვენი თანხმობის გარეშე არაფერი შეიცვლება.',
        ],
      },
      {
        heading: 'კანონი',
        paragraphs: [
          'ეს წესები საქართველოს კანონმდებლობას ექვემდებარება. თუ უთანხმოებას ერთად ვერ მოვაგვარებთ, გადაწყვეტს თბილისის სასამართლო. მომხმარებლის უფლებები, რომლებსაც საქართველოს კანონი გაძლევთ, ყოველთვის მოქმედებს.',
        ],
      },
    ],
  }
}
