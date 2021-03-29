import 'typeface-roboto';

import { Feature as GeojsonFeature } from 'geojson';
import { Feature, Map, MapBrowserEvent, View } from 'ol';
import { Coordinate } from 'ol/coordinate';
import GeoJSON from 'ol/format/GeoJSON';
import Geolocation from 'ol/Geolocation';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import * as proj from 'ol/proj';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import { getLength } from 'ol/sphere';
import Fill from 'ol/style/Fill';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Style from 'ol/style/Style';
import React, { createElement, useState } from 'react';
import ReactDOM from 'react-dom';
import kidrunImage from 'url:../images/kidrun.png';
import starImage from 'url:../images/star.png';

import { GoalCodeInput } from './GoalCodeInput';
import steps from './steps';

export type Progress = {
  currentStep: number
}

export type Step = {
  path: GeojsonFeature
  goalText: string
  preamble: string
  goalPosition: [number, number]
  stepCode: string
}

export class PaaskeRebus {
  public norgeibilderLayer = new TileLayer({
    source: new TileWMS({
      url: 'https://wms.geonorge.no/skwms1/wms.nib',
      params: { LAYERS: 'ortofoto' },
      serverType: 'geoserver',
      hidpi: false,
      cacheSize: 256,
    }),
    zIndex: 0,
  })
  public stepLayer = new VectorLayer({
    source: new VectorSource(),
    zIndex: 2000,
  })
  public progress: Progress | null = null
  public geolocation: Geolocation | null = null
  public navigationFeature: Feature = new Feature()
  public navAccuracyFeature: Feature = new Feature()
  public navigationLayer: VectorLayer = new VectorLayer({
    source: new VectorSource({
      features: [this.navigationFeature],
    }),
  })
  public map = new Map({
    target: document.getElementById('themap'),
    layers: [this.norgeibilderLayer, this.navigationLayer, this.stepLayer],
    controls: [],
    view: new View({
      center: [863478.8867920995, 9127113.510003772],
      zoom: 20,
    }),
    pixelRatio: 1,
  })
  constructor() {
    this.map.on('click', (event: MapBrowserEvent) => {
      console.log(proj.toLonLat(event.coordinate))
    })
    this.enableNavigation()
    this.loadProgress()
    this.showSteps(this.progress.currentStep)
  }
  private updateNavAccuracy() {
    this.geolocation && this.navAccuracyFeature.setGeometry(this.geolocation.getAccuracyGeometry())
  }
  public enableNavigation() {
    this.navigationFeature.setStyle(
      new Style({
        image: new Icon({
          src: kidrunImage,
          scale: 0.06,
          opacity: 1,
        }),
      })
    )
    this.navAccuracyFeature.setStyle(
      new Style({
        fill: new Fill({
          color: 'rgba(0,0,0,0.2)',
        }),
        stroke: new Stroke({
          color: 'rgba(0,0,0,0.5)',
        }),
      })
    )
    this.geolocation = new Geolocation({
      trackingOptions: {
        enableHighAccuracy: true,
      },
      projection: this.map.getView().getProjection(),
    })
    this.geolocation.setTracking(true)
    this.updateNavPosition()
    this.geolocation.on('change:position', this.updateNavPosition.bind(this))
    this.geolocation.on('change:accuracyGeometry', this.updateNavAccuracy.bind(this))
  }
  private updateNavPosition() {
    const coords = this.geolocation && this.geolocation.getPosition()
    if (coords) {
      this.navigationFeature.setGeometry(coords ? new Point(coords) : undefined)
      this.checkGoalDistance(coords)
      this.navigationLayer.changed()
      this.map.renderSync()
      this.map.getView().animate({
        center: coords,
        duration: 100,
      })
    }
  }
  public focusNav() {
    this.map.getView().animate({
      center: (this.navigationFeature.getGeometry() as Point).getCoordinates(),
    })
  }
  public nextStep() {
    document.getElementById('goalCodeInput').style.display = 'none'
    this.progress.currentStep++
    localStorage.setItem('paaske2021', JSON.stringify(this.progress))
    this.showSteps(this.progress.currentStep)
  }
  public loadProgress() {
    const data = localStorage.getItem('paaske2021')
    let progress: Progress
    if (data) {
      try {
        progress = JSON.parse(data)
      } catch {
        console.log('could not parse json')
      }
    } else {
      progress = {
        currentStep: 0,
      }
      localStorage.setItem('paaske2021', JSON.stringify(progress))
    }
    console.log('using progress', progress)
    this.progress = progress
  }
  public showSteps(stepIndex: number) {
    this.stepLayer.getSource().clear()
    ;(steps as Step[]).forEach((step, index) => {
      if (index > stepIndex) {
        return
      }
      if (index === stepIndex) {
        if (step.preamble) {
          document.getElementById('questText').style.display = 'block'
          document.getElementById('questText').innerHTML = step.preamble
        } else {
          document.getElementById('questText').style.display = 'none'
        }
      }
      const pathFeature = new GeoJSON().readFeature(step.path, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857',
      })
      pathFeature.setStyle(
        new Style({
          stroke: new Stroke({
            color: index < stepIndex ? 'rgba(250,250,255, 0.7)' : 'rgba(250,250,10, 0.8)',
            width: 5,
          }),
        })
      )
      this.stepLayer.getSource().addFeature(pathFeature)
    })
  }
  public checkGoalDistance(coords: Coordinate) {
    if (this.progress) {
      const line = new LineString([proj.fromLonLat(steps[this.progress.currentStep].goalPosition), coords])
      // const f = new Feature(line)
      // f.setStyle(
      //   new Style({
      //     stroke: new Stroke({
      //       color: 'red',
      //       width: 5,
      //     }),
      //   })
      // )
      // this.stepLayer.getSource().addFeature(f)
      // console.log(line.getCoordinates())

      // console.log(line.getLength())
      const distance = getLength(line)
      console.log('DISTANCE TO GOAL', distance)
      if (distance < 10) {
        this.showGoal()
      }
    }
  }
  public showGoal() {
    document.getElementById('goalCodeInput').style.display = 'block'
    const goalFeature = new Feature(new Point(proj.fromLonLat(steps[this.progress.currentStep].goalPosition)))
    goalFeature.setStyle(
      new Style({
        image: new Icon({
          src: starImage,
          scale: 0.1,
          opacity: 1,
        }),
      })
    )
    document.getElementById('questText').innerHTML = steps[this.progress.currentStep].goalText
    this.stepLayer.getSource().addFeature(goalFeature)
    ReactDOM.render(createElement(GoalCodeInput), document.getElementById('goalCodeInput'))
  }
  public tryCode(code: string) {
    if (code === steps[this.progress.currentStep].stepCode) {
      this.nextStep()
    }
  }
}
