<?php

namespace Bravo3\SpaBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;

abstract class AbstractSpaController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function render($view, array $parameters = [], Response $response = null)
    {
        if ($this->isSpaRequest()) {
            return $this->get('spa.renderer')->createSpaResponse($view, $parameters, $response);
        } else {
            return parent::render($view, $parameters, $response);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function renderView($view, array $parameters = [])
    {
        if ($this->isSpaRequest()) {
            return $this->get('spa.renderer')->renderSpaView($view, $parameters);
        } else {
            return parent::renderView($view, $parameters);
        }
    }

    /**
     * Test if this request is a SPA XHR request
     *
     * @return bool
     */
    protected function isSpaRequest()
    {
        return $this->get('spa.renderer')->isSpaRequest();
    }
}
