Bravo3 Single-Page Application for Symfony 2
============================================

This bundle enables you to turn any normal Symfony 2 application into a 'SPA' application, causing the first page load
to be rendered normally and all consequtive page hits to be loaded via XHR.

Page content is broken into "blocks", only required blocks of the main site layout will be re-rendered.

This bundle requires your application to use Twig rendering, only minor changes to the controller are required:
    
    class HomeController extends AbstractSpaController
    {
        /**
         * @Route("/", name="home")
         * @param Request $request
         * @return Response
         */
        public function homeAction(Request $request)
        {
            // .. 
            
            // Call the AbstractSpaController#render() function to trigger the SPA engine -
            return $this->render('@MySiteBundle/Home/home.html.twig', ['param' => 'value']);
        }
    }
