import 'rxjs/add/operator/map'
import { Component, OnInit, ViewChild } from '@angular/core';
import { Route } from '@shared/route.model';
import { RouteService } from '@shared/route.service';
import { UtilityService } from '@shared/utility.service';
import { LoginService } from '@shared/login.service';
import { SelectItem, DataTable } from 'primeng/primeng';
import { SessionService, UserSession } from '@shared/session.service';
import { FilterBounds, FilterValues } from '@shared/routefilter.model'
import * as $ from 'jquery';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html'
})

export class MainComponent implements OnInit {

  allRoutes: Route[];
  routes: Route[];
  private defaultBookmarkedFilter = new ConcreteSelectItem('nuovo', 'Nuovo filtro');
  savedFilterSelected: ConcreteSelectItem;
  bookmarkedFilters: ConcreteSelectItem[] = [this.defaultBookmarkedFilter];
  bookmarkedRoutes: boolean;
  bookmarkedFilterModal = false;

  filterValues = new FilterValues();
  filterBounds = new FilterBounds();

  constructor(private routeService: RouteService,
    private loginService: LoginService,
    private sessionService: SessionService) { }

  @ViewChild('dataTableIstance') dt: DataTable;
  ngOnInit() {
    var root = this;
    this.routeService.getAllRoutes()
      .subscribe((result: any) => {
        this.allRoutes = 	$.extend({}, result.routes);
        this.routes = result.routes.sort((a, b) => { return (b.id - a.id) });
        this.filterBounds = root.calcFilterBounds(this.routes);
      },
      err => console.log(err));

    UtilityService.resizeToParent($('.tableContainer'), -42);

    // thanks to https://stackoverflow.com/a/46370483/1306679
    this.dt.filterConstraints['atMost'] = function atMost(value: number, filterValue: any): boolean {
      if (filterValue === undefined || filterValue === null)
        return true;
      if (value == null)
        return false;
      return value <= filterValue;
    }
  }

  calcFilterBounds(routes: Route[]): FilterBounds {
    var root = this;
    var filterBounds = new FilterBounds();
    var dictionary;
    // Ottenimento dei possibili valori dei luoghi da visitare
    dictionary = routes.reduce((dictionary, route) => dictionary.add(route.luogo), new Set<string>());
    dictionary.forEach(place => filterBounds.places.push(new ConcreteSelectItem(place, place)));

    // Possibili valori delle difficoltà degli itinerari
    dictionary = routes.reduce((dictionary, route) => dictionary.add(route.difficolta), new Set<string>());
    dictionary.forEach(difficulty => filterBounds.difficulties.push(new ConcreteSelectItem(difficulty, difficulty)));

    filterBounds.periods = [
      new ConcreteSelectItem('Inverno', 'Inverno'),
      new ConcreteSelectItem('Primavera', 'Primavera'),
      new ConcreteSelectItem('Estate', 'Estate'),
      new ConcreteSelectItem('Autunno', 'Autunno')
    ];
    // Data minima e massima
    var routesToSort = JSON.parse(JSON.stringify(routes));
    var sorted = routesToSort.sort((a, b) => { return (a.id - b.id) });
    filterBounds.minDate = new Date(sorted[0].data);
    filterBounds.maxDate = new Date(sorted[sorted.length - 1].data);

    // Bounds di lunghezza
    sorted = routesToSort.sort((a, b) => { return (a.lunghezza - b.lunghezza) });
    filterBounds.minRouteLength = sorted[0].lunghezza;
    filterBounds.maxRouteLength = sorted[sorted.length - 1].lunghezza

    // Bounds di durata
    sorted = routesToSort.sort((a, b) => { return (a.durata - b.durata) });
    filterBounds.minDuration = sorted[0].durata;
    filterBounds.maxDuration = sorted[sorted.length - 1].durata

    // Bounds di durata
    sorted = routesToSort.sort((a, b) => { return (a.dislivello - b.dislivello) });
    filterBounds.minElevation = sorted[0].dislivello;
    filterBounds.maxElevation = sorted[sorted.length - 1].dislivello
    return filterBounds;
  }

  loadBookmarkedRoutes() {
    let session = this.sessionService.getSession();
    if (session == null)
      return;

    this.bookmarkedRoutes = !this.bookmarkedRoutes;
    if(this.bookmarkedRoutes)
      this.routes = this.sessionService.getSession().savedRoutes;
    else
      this.routes = $.extend([], this.allRoutes).sort((a, b) => { return (b.id - a.id) });
  }

  // gestione dei filtri preferiti
  bookmarkedFilterChanged(filterSelectedValue: string) {
    let session = this.sessionService.getSession();
    if (!session)
      return;
    if (filterSelectedValue == this.defaultBookmarkedFilter.value)
      this.bookmarkedFilterModal = true;
    else {
      this.routeService.getFilter(filterSelectedValue, session.loginToken)
        .subscribe((result: any) => {
          if (!result.Return) {
            //TODO: da fixare l'errore
            //if (result.error == "INCORRECT_LOGIN")
            return;
          }
          this.filterValues = result.filter;
        }, err => console.log(err));
    }
  }

  saveBookmarkedFilter(filter: FilterValues) {
    let session = this.sessionService.getSession();
    if (!session)
      return;
    this.routeService.saveFilter(filter, session.loginToken)
      .subscribe((result: any) => {
        if (!result.Return) {
          //TODO: da fixare l'errore
          //if (result.error == "INCORRECT_LOGIN")
          return;
        }
        let newBookmarkedFilter = new ConcreteSelectItem(filter.name, filter.name);
        this.savedFilterSelected = newBookmarkedFilter;
        this.bookmarkedFilters.push(newBookmarkedFilter);
        this.bookmarkedFilterClosed();
      }, err => console.log(err));
  }
  bookmarkedFilterClosed() {
    this.bookmarkedFilterModal = false;
  }
}

class ConcreteSelectItem implements SelectItem {
  constructor(
    public value: string,
    public label: string) {
  }
}
