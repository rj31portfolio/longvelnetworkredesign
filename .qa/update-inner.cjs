const fs = require('node:fs');
const files = fs.readdirSync('.').filter(file => file.endsWith('.html') && file !== 'index.html' && !file.startsWith('google'));
const pageClasses = {
  'about.html': 'page-company', 'portfolio.html': 'page-expert', 'about-us.html': 'page-expert',
  'product.html': 'page-products', 'product-detail.html': 'page-products', 'contact.html': 'page-contact',
  'Maximizing-Efficiency-With-Refurbished-Switch-Rentals-A-Guide-for-Businesses.html': 'page-switch-article',
  'The-Ultimate-Guide-to-Refurbished-Router-Rentals.html': 'page-router-article',
  'Refurbished-Firewall-Rental-Services.html': 'page-security-article',
  'Why-Renting-Refurbished-Network-Equipment-Is-a-Smart-Move-for-Your-Business.html': 'page-hardware-article'
};
const imageMap = {
  'img/about-1.jpg': ['datacenter-interior', 'Blue-lit enterprise data center infrastructure'],
  'img/about-2.jpg': ['hardware-testing', 'Network hardware undergoing testing before deployment'],
  'img/vis.png': ['datacenter-interior', 'Modern data center supporting reliable scalable networks'],
  'img/miss.png': ['hardware-testing', 'Refurbished switches being tested in a network equipment lab'],
  'img/value.png': ['network-support', 'Network specialists collaborating on technical support'],
  'img/why-1.jpg': ['switch-rentals', 'Enterprise network switches with blue Ethernet connections'],
  'img/why-2.png': ['hardware-testing', 'Quality checks for refurbished networking equipment'],
  'img/value-pro.jpg': ['hardware-testing', 'Professional network equipment testing and configuration'],
  'img/blog/1.png': ['switch-rentals', 'Refurbished network switches in a modern data center'],
  'img/blog/1-long.png': ['switch-rentals', 'Refurbished network switches in a modern data center'],
  'img/blog/2.jpg': ['router-rentals', 'Enterprise router connected to a blue network cable'],
  'img/blog/2-long.png': ['router-rentals', 'Enterprise router connected to a blue network cable'],
  'img/blog/3.png': ['firewall-security', 'Enterprise firewall appliance securing network connections'],
  'img/blog/3-long.png': ['firewall-security', 'Enterprise firewall appliance securing network connections'],
  'img/blog/4.png': ['hardware-testing', 'Refurbished network equipment undergoing quality testing'],
  'img/blog/4-long.png': ['hardware-testing', 'Refurbished network equipment undergoing quality testing']
};
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('css/inner-imagery.css')) html = html.replace('</head>', '    <link href="css/inner-imagery.css" rel="stylesheet">\n</head>');
  html = html.replace(/<body class="([^"]*)">/, (_, classes) => `<body class="${classes}${classes.includes('interior-imagery') ? '' : ' interior-imagery ' + (pageClasses[file] || 'page-general')}">`);
  html = html.replace(/<img\b[^>]*>/g, tag => {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (!imageMap[src]) return tag;
    const [asset, alt] = imageMap[src];
    tag = tag.replace(`src="${src}"`, `src="img/generated/${asset}.jpg"`);
    tag = tag.replace(/\s(?:alt|loading|decoding|width|height)="[^"]*"/g, '');
    return tag.replace(/\s*\/?\>$/, ` alt="${alt}" loading="lazy" decoding="async" width="1536" height="1024">`);
  });
  // The product-detail template referenced an image that is absent from the repository.
  if (file === 'product-detail.html') {
    html = html.replace(/<img\b[^>]*>/g, tag => {
      if (!tag.includes('src="img/product/1.jpg"')) return tag;
      const featured = tag.includes('featured-image') || tag.includes('small-Img');
      return tag.replace('src="img/product/1.jpg"', `src="img/product/${featured ? '3850' : '2200'}.png"`).replace(/alt="[^"]*"/, `alt="${featured ? '3850 series network switch' : '2200 series network switch'}"`);
    });
  }
  if (file === 'contact.html' && !html.includes('contact-visual')) {
    html = html.replace('<h3 class=" mb-4 heading"', '<figure class="contact-visual"><img src="img/generated/network-support.jpg" alt="Network support specialists reviewing an enterprise infrastructure solution" width="1536" height="1024" loading="lazy" decoding="async"></figure>\n                            <h3 class=" mb-4 heading"');
  }
  fs.writeFileSync(file, html);
}
console.log(`Updated imagery on ${files.length} interior pages.`);
