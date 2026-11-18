/*
  iLoveLatins site content.
  Lines ending in _es are the Spanish version of the line above them: change both together.
  This is the one file to edit when dates, prices or contact details change.
  Anything left as '' is simply not shown on the site.
*/
window.ILL = {
  contact: {
    name: 'Sam Smith',
    phoneDisplay: '832-385-4161',
    phoneLink: '+18323854161',
    email: 'iLoveLatinsVacations@gmail.com',
    whatsappGroup: 'https://chat.whatsapp.com/FEq4WaAWiylIFiqvFz3wKc',
    hours: 'Mon–Fri, 9am–6pm Central',
    hours_es: 'Lunes a viernes, 9am–6pm, hora del centro de EE. UU.'
  },

  // Where the contact form is delivered: the site's own contact-message function,
  // which emails it to the owners. If this is emptied, the form opens the
  // visitor's email app with the message already written instead.
  formEndpoint: 'https://fdhntvzctkdojldxduan.supabase.co/functions/v1/contact-message',

  deposit: 250,

  // Videos from Sam's YouTube channel (youtube.com/@user-ye3wm9sb8k).
  // The id is the part after "v=" in a YouTube link.
  videos: [
    { id: 'WmqkM2xOhkY', title: 'Day one', when: 'September 13, 2019',
      title_es: 'Día uno', when_es: '13 de septiembre de 2019' },
    { id: 'K-8WZNkQPOQ', title: 'Day one, the party', when: 'September 13, 2019',
      title_es: 'Día uno, la fiesta', when_es: '13 de septiembre de 2019' },
    { id: 'WLwA71GS3Mg', title: 'Day two', when: 'September 14, 2019',
      title_es: 'Día dos', when_es: '14 de septiembre de 2019' },
    { id: '5znW_2c8XS0', title: 'Day two, another clip', when: 'September 14, 2019',
      title_es: 'Día dos, otro video', when_es: '14 de septiembre de 2019' },
    { id: 'QNyH4jRfwDM', title: 'Day three', when: 'September 15, 2019',
      title_es: 'Día tres', when_es: '15 de septiembre de 2019' },
    { id: 'ao4ZzGIefhc', title: 'Day three, another clip', when: 'September 15, 2019',
      title_es: 'Día tres, otro video', when_es: '15 de septiembre de 2019' }
  ],
  youtubeChannel: 'https://www.youtube.com/@user-ye3wm9sb8k',

  // Social media pages, shown as "Follow us" links at the bottom of every page.
  // Paste a page's address between the quotes; anything left as '' is not shown.
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61596746908010',
    instagram: 'https://www.instagram.com/ilovelatinstours/'
  },

  // Online reservations close this many days before a tour starts.
  // Add bookable: false to a tour to list it as a date only, with no deposit.
  bookingCutoffDays: 30,

  tours: [
    {
      id: 'carnaval-2027',
      name: 'Barranquilla Carnaval: Sam will be there',
      name_es: 'Carnaval de Barranquilla: Sam estará allí',
      city: 'Barranquilla',
      start: '2027-02-06',
      end: '2027-02-09',
      // false = a date to know about, not a hosted tour: no deposit, no Reserve button.
      bookable: false,
      blurb: 'Sam will be at Carnaval, one of the biggest street festivals in the world. This is not a hosted tour, so there is nothing to book. The Romance Tour starts two days later.',
      blurb_es: 'Sam estará en el Carnaval, una de las fiestas callejeras más grandes del mundo. No es un tour con anfitrión, así que no hay nada que reservar. El Tour de Romance empieza dos días después.',
      packagePrice: '',
      hotel: '',
      depositLink: ''
    },
    {
      id: 'romance-feb-2027',
      name: 'Romance Tour',
      name_es: 'Tour de Romance',
      city: 'Barranquilla',
      start: '2027-02-11',
      end: '2027-02-16',
      blurb: 'The week after Carnaval, when hotel and airline prices are much lower. Singles socials and a local host.',
      blurb_es: 'La semana después del Carnaval, cuando los hoteles y los vuelos cuestan mucho menos. Eventos para solteros y un anfitrión local.',
      packagePrice: '',
      hotel: 'Events at Hotel American Golf (rooms booked separately)',
      hotel_es: 'Eventos en el Hotel American Golf (las habitaciones se reservan aparte)',
      depositLink: ''
    },
    {
      id: 'summer-2027',
      name: 'Sizzling Summer Vacation',
      name_es: 'Vacaciones de Verano',
      city: 'Colombia',
      start: '2027-06-17',
      end: '2027-06-25',
      blurb: 'The long one. Nine days of sun and singles events.',
      blurb_es: 'El tour largo. Nueve días de sol y eventos para solteros.',
      packagePrice: '',
      hotel: '',
      depositLink: ''
    },
    {
      id: 'amor-y-amistad-2027',
      name: 'Amor y Amistad',
      city: 'Colombia',
      start: '2027-09-09',
      end: '2027-09-14',
      blurb: 'Colombia’s own Valentine’s weekend, and Sam’s birthday party too.',
      blurb_es: 'El fin de semana de San Valentín colombiano, y también la fiesta de cumpleaños de Sam.',
      packagePrice: '',
      hotel: '',
      depositLink: ''
    }
  ]
};
