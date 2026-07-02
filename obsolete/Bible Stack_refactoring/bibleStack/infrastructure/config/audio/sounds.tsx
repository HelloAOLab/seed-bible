export const Sounds = {
  SectionSelection: "SectionSelection",
  SectionExpand: "SectionExpand",
  BookExpand: "BookExpand",
  BookShrink: "BookShrink",
  StackPieceDrop: "StackPieceDrop",
  AlertAnimation: "AlertAnimation",
  StackPiecePulledOut: "StackPiecePulledOut",
  PushElementToParent: "PushElementToParent",
  SelectTestament: "SelectTestament",
  SelectBible: "SelectBible",
  HighlightElement: "HighlightElement",
  EjectBook: "EjectBook",
  Law: "Law",
  History: "History",
  Prophets: "Prophets",
  Wisdom: "Wisdom",
  history2: "history2",
  Gospels: "Gospels",
  Letters: "Letters",
  apocalypse: "apocalypse",
  BibleCovertSound: "BibleCovertSound",
  BibleOpenSound: "BibleOpenSound",
  TestamentHover: "TestamentHover",
  TestamentOpen: "TestamentOpen",
  SectionHover: "SectionHover",
  SectionOpen: "SectionOpen",
  BookHover: "BookHover",
  BookSelect: "BookSelect",
  String_06c: "String_06c",
  String_08f: "String_08f",
  String_09g: "String_09g",
  String_11c: "String_11c",
  String_10a: "String_10a",
  String_01c: "String_01c",
  String_03f: "String_03f",
  String_04g: "String_04g",
  String_05a: "String_05a",
  String_13f: "String_13f",
  String_14g: "String_14g",
  String_07e: "String_07e",
  String_02e: "String_02e",
  String_12e: "String_12e",
  String_16c: "String_16c",
} as const;

export type Sound = (typeof Sounds)[keyof typeof Sounds];

export const soundsMap: Record<Sound, string | string[]> = {
  SectionSelection:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/e2a680b2fb9506e3716576e169be303d25ee84f5009bdc215c315ae5eb79fb9f.wav",
  SectionExpand:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/eaa237462cbec4584673629de2276a5c1ad34a2aa4087f3f136d3219489990cd.wav",
  BookExpand:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/2564acdf8542b95db2dfad28afbe331820fefd064239f1c635e82db0fe74b337.wav",
  BookShrink:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/35c2c03a8d928a42eed697602787bbffbfaaccdac49735a5ecd6c2c580e0ebb7.wav",
  StackPieceDrop:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/fd39330df4f377669f0138dd02ae678535dd5e85bbf7c80551756b1882f84056.wav",
  AlertAnimation:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/5be90104ffa1e7af00bc7ca10dd5e0958ae0d732d37a9ac22b9973779049220a.wav",
  StackPiecePulledOut:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/19f62b5165973f9fdfccf1e54f6b82ca08e22808e7663e0ec4fb7f1c91022951.mpga",
  PushElementToParent:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/eb241bebf0269caada68715b2acba02f55bc886f92380a8fa98f5a7f3b4eda92.mpga",
  SelectTestament:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/492043457fa72edeb01d71536fb2e641d9379c0c9de8c5527839fbf5fc75fb00.wav",
  SelectBible:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/6948b3a81488353bd0882fcd6ec4b0dc087f17f0379ac59a5f3356bda15c05bf.wav",
  // SelectBible: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/a30986eaa67a9fc7ebdf1dbda795f0a33989602598b80383f7c3ff8ef753e356.mpga",
  HighlightElement:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/bc57b4b273b35e9b772510589af353fab6e6fe13946922e002c722f0c82f2ad4.mpga",
  EjectBook:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/54a0ef494c12caad064b1c4d9d141a71a6f6c0640a013bd9b96850f525657e23.mpga",
  Law: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/950287bee7b9e80d9859a5f92b5be3e184771a5c95c0cf3d26774a4a77a234dd.mpga",
  History:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/cae72267a1ce66c6a1e18a8e1ff8e924ca4eb37c10ec25d8b6604dabefae7b4d.mpga",
  Prophets:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c92a04f6832024f398d6e41d3c114c0ac104a2826050817514f37434d69a7a6d.mpga",
  Wisdom:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8974c0b31e0351d12f99f04c9731fb48644d1b80820465e7d9eb6092e2929ae6.mpga",
  history2:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8884a4cea67fac0e5fa15041ea95456d23b559061b32b9b26a200e58018ce128.mpga",
  Gospels:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d6e910264858e43ced7691dffd1d0cd161ba6a0d93308468710b4a2e25a51871.mpga",
  Letters:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a98a59a430c15eb1fb4ece10ca026d698d14c765328db759fbb604b0f4121da1.mpga",
  apocalypse:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8b10e1fb1dde97265824956d9d06aa4918bb033d9c0017c3a062dbfea18a18d0.mpga",
  BibleCovertSound:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c0a9bdcf7fe443e78e1cf0ca6de83f072396003b95adcc7761d48424b9b5dc7d.mpga",
  BibleOpenSound:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7dd1780555bfe000c24ad29afadb9285b1d08a2cbcb04e5e2c64dc37d86b8bb9.mpga",
  TestamentHover: [
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/2a3ef3a2c0016bc45d02d5dd2296cce025494a53d6cb31943a74384a01a560b6.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/6a817d3b333099fb26fa5e87f1df0cd08b0249a57722958631b268ebeb1f6a5a.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b8e240fa2d3e5a5f3e6d2611faaa19d7d4f77b14268239fcc02ce74c32db6afe.mpga",
  ],
  TestamentOpen:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9483388ba2acdb5c15196e393f95651b7862e147ddd34aedbb95934450004d76.mpga",
  SectionHover:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9c74d0aedc75594d205464a6191d90b653a9316baae15c860d9be779937515ca.mpga",
  SectionOpen:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7882723351df69768b735ccdaeabff9b0fa28600e60bc614f75f8465ea18a36c.mpga",
  BookHover: [
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e658f05e5ffd0a0aa8cfd9f26a3c188c3dd0439646f9190611e1a976f3d49cae.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9c74d0aedc75594d205464a6191d90b653a9316baae15c860d9be779937515ca.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5fd13bb8c67e3c9c0e126f407489509c8cb761fe9e8442c4824d75d237f44c50.mpga",
  ],
  BookSelect: [
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ec8b4e57f99fa394943d75b5a1b0868a08b3b19e777df542a941d444e92ccf97.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b9d883188be8cc81416ae6536502f0f1c4fd701b05772de0e60fcd01083c8ddb.mpga",
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0ae29bd00b160b07e956d39f164d34b69a742553106b057fe9346b7b8c954b2a.mpga",
  ],
  String_06c:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/f59af28843c845ac1e896fced3e2ca327c47c929ff3cd2cb02f1da88308b34ef.wav",
  String_08f:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/myRecord/08c6a5f59ece11eaee8f170c63f0b0fcf8ac07118c88d92677dac0102345dbbb.oga",
  String_09g:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/392b8e1ef3873c0c29bff06b6ddfc2214430a4dcf2ad7e80ca24f21aa6408aaf.wav",
  String_11c:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/c3e2dbe171cd2c42e62ffd0e23705d18146d4fda125e5c3be89bc610350f32ae.wav",
  String_10a:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/7b4aa96817b078dca915b652a3b9e6320ef72254c134155b2f5baa6e8da7e972.wav",
  String_01c:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/e6204dbbb645961cfbf2cc0ecdf1ebc6090235fac765fc8004788ba0f1f7a2a8.wav",
  String_03f:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/0e2e56937ca10654da2bf1e0266954cc9936d4bd622bda736cfd6c04cced8b1a.wav",
  String_04g:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/c004e0551fbbb7641dabdff175f84f57ba53633639a4ce2b1206d5fb2f1058f1.wav",
  String_05a:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/myRecord/d8993e4a1c6c7c3956285ee169786f362d1cd7d2114e8afbf8159fd63e45f4ec.oga",
  String_13f:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/5a38ae73a484505930301b2acedb8725b249cc6cbbbed9db3f2cfec6a771f533.wav",
  String_14g:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/013a287e8fe8c0802503297b783dcdaf98bc1521ba4448c555df45c9f72961a7.wav",
  String_07e:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/myRecord/244619f89a32aa196c936bb84b314a1a8ddac483404b7cd022d177a1dd69726d.oga",
  String_02e:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/a3812fe6f95c8ec6cb60aa99ac73cf9c082c6ea6a50b58a89b689e721e5713be.wav",
  String_12e:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/9623651e135dc91ac13cfbe63bee2f3acbbe4788174076aa6f6a8c84fda261d5.wav",
  String_16c:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/mySounds/03a10aa1283ced90d56595891542927fcbb0296e5419272828ed42a9962c982a.wav",
} as const;
