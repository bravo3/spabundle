<?php
namespace Bravo3\SpaBundle\Services;

use Symfony\Bundle\FrameworkBundle\Templating\EngineInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SpaRenderer
{
    const SPA_HTTP_HEADER = 'x-spa-request';
    /**
     * @var EngineInterface
     */
    protected $templating;

    /**
     * @var \Twig_Environment
     */
    protected $twig;

    /**
     * @var Request
     */
    protected $request;

    /**
     * @var string
     */
    protected $title_block;

    public function __construct(EngineInterface $templating, \Twig_Environment $twig, Request $request, $title_block)
    {
        $this->templating  = $templating;
        $this->twig        = $twig;
        $this->request     = $request;
        $this->title_block = $title_block;
    }

    /**
     * Get the title block name
     *
     * @return string
     */
    public function getTitleBlock()
    {
        return $this->title_block;
    }

    /**
     * Test if this request is a SPA XHR request
     *
     * @return bool
     */
    public function isSpaRequest()
    {
        return (int)$this->request->headers->get(self::SPA_HTTP_HEADER, 0) === 1;
    }

    /**
     * Render the SPA XHR response as a Response object
     *
     * @param string   $view
     * @param array    $parameters
     * @param Response $response
     * @return Response
     */
    public function createSpaResponse($view, array $parameters = [], Response $response = null)
    {
        if ($response === null) {
            $response = new Response();
        }
        $response->headers->set('Content-Type', 'application/json');
        $response->setContent($this->renderSpaView($view, $parameters));
        return $response;
    }

    /**
     * Render a SPA XHR response as a JSON string
     *
     * @param string $view
     * @param array  $parameters
     * @return string
     */
    public function renderSpaView($view, array $parameters = [])
    {
        $out         = new \stdClass();
        $out->title  = '';
        $out->blocks = [];

        /** @var \Twig_Template $template */
        $template   = $this->twig->loadTemplate($view);
        $blocks     = $template->getBlockNames();
        $parameters = $this->twig->mergeGlobals($parameters);

        foreach ($blocks as $block_name) {
            $out->blocks[$block_name] = $template->renderBlock($block_name, $parameters, $template->getBlocks());
            if ($block_name == $this->title_block) {
                $out->title = $out->blocks[$block_name];
            }
        }

        return $this->templating->render('@Spa/Spa/xhr.json.twig', ['response' => $out]);
    }
}
