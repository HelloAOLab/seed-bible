export const INITIAL_ANNOTATION_FILTERS = {
  sources: {} as Record<string, boolean>,
  tags: {} as Record<string, boolean>,
  verse: {} as Record<string, boolean>,
  fromDate: null as string | null,
  toDate: null as string | null,
  dateOption: "any",
};

export const ANNOTATION_LIST_ICONS = {
  chevronDown:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d03c885823b300c141eed037466a2ad6ab59f9523e2ada5ac781f4f3e5e7e45f.svg",
  chevronDown2:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/0687c52f6f7d6f7d25052a14b3ee38581ad5753ffd139edc5ffffa378dd30fdf.svg",
  tags: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c4473eb66d4b6947be29fa8df15689fbcb23cf7e970d480b2c6f9ecae14026c5.svg",
  dot: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/dcf47b43fe68034fe7cf0b4e4400f7267cf9c320b6175fe77d44f70459fe50a5.svg",
  filter:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/b643c8bdb01906312ff5302bb029c1b8c35cd7a9a0a1f8f22e1358ccf675794e.svg",
  delete:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/86e70522cf977646771dfcffbafda114f8d4a7dbf39923d6791a66b8a25c2a56.svg",
  edit: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/badbe8b10d39a043fbf49a7d7749e4fc311c34c1c8c562ab60ee052e470f5451.svg",
};

export const ANNOTATION_LIST_FILTER_ICONS = {
  sources:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/e0e41197b32166d247f31fc36f1ad6c90f02723edda1c33c57c22a63514e6fc3.svg",
  tags: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/d6c4e22382dff7567a7f1490ecea9fe6a924d103ba43ff06a297908ab9716ad2.svg",
  date: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/9e274544bbbbde7666d86fb96abb0fdd6b8c46aa2ed6589a11a521fc329dd81d.svg",
  verses:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/6ba4514da1d4169a54082a5554aea48f96d6b9736cd939adf49563f8e6807d00.svg",
};

export const EDITABLE_ATTACHMENT_TYPES: Record<string, boolean> = {
  youtube: true,
  iframe: true,
  video: true,
  Video: true,
  externalLink: true,
  date: true,
};

export const AUTOPLAY_ICONS = {
  FALSE:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ef49fd6fb22cd50cb67463c2ddaee79e9076b2e228a6ec35802e5a1fac666c8f.svg",
  TRUE: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9721a3a303021e8c4b84b6c3e939718a5a7ab773d84fd305351bf3f5081fbeca.svg",
};
