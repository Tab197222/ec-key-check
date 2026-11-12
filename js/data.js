/*
  iLoveLatins site content.
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
    hours: 'Mon–Fri, 9am–6pm Central'
  },

  // Where the forms are delivered. Paste a form service URL here
  // (for example a Formspree endpoint). While it is empty, each form
  // opens the visitor's email app with the message already written.
  formEndpoint: '',

  deposit: 250,

  // Online reservations close this many days before a tour starts.
  bookingCutoffDays: 30,

  tours: [
    {
      id: 'thanksgiving-2026',
      name: 'Early Thanksgiving Romance Tour',
      city: 'Barranquilla',
      start: '2026-11-19',
      end: '2026-11-24',
      blurb: 'An early Thanksgiving on the Caribbean coast, with hosted socials through the week.',
      packagePrice: '',   // e.g. '$1,450 per person, hotel and events included'
      hotel: '',          // e.g. 'Hotel name, neighbourhood'
      depositLink: ''     // a payment link for the $250 deposit, when you have one
    },
    {
      id: 'carnaval-2027',
      name: 'Barranquilla Carnaval',
      city: 'Barranquilla',
      start: '2027-02-06',
      end: '2027-02-09',
      blurb: 'Four days at Carnaval, one of the biggest street festivals in the world. Sam will be there.',
      packagePrice: '',
      hotel: '',
      depositLink: ''
    },
    {
      id: 'romance-feb-2027',
      name: 'Romance Tour',
      city: 'Barranquilla',
      start: '2027-02-11',
      end: '2027-02-16',
      blurb: 'The week after Carnaval, when hotel and airline prices are much lower. Singles socials and a local host.',
      packagePrice: '',
      hotel: '',
      depositLink: ''
    },
    {
      id: 'summer-2027',
      name: 'Sizzling Summer Vacation',
      city: 'Colombia',
      start: '2027-06-17',
      end: '2027-06-25',
      blurb: 'The long one. Nine days of sun and singles events.',
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
      packagePrice: '',
      hotel: '',
      depositLink: ''
    }
  ]
};
